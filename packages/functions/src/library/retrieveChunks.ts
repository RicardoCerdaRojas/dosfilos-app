import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldPath } from 'firebase-admin/firestore';
import { appCheckCallableOptions } from '../config/appCheckOptions';
import { sanitizeExtractedText } from './sanitizeExtractedText';

interface RetrieveRequest {
    query: string;
    stores?: string[];       // Core Library store keys (e.g. ['exegesis', 'tutor-griego'])
    corpusIds?: string[];    // Agent's legacy corpus URIs (fileSearchStores/...); server reverse-resolves to keys
    userId?: string;         // When set, restrict to chunks whose `userId` matches (personal library scope)
    resourceIds?: string[];  // When set, restrict to chunks of these specific documents (project scope)
    topK?: number;           // Default 10
    minSimilarity?: number;  // Default 0
    perResourceTopK?: number; // When set with resourceIds: run N parallel findNearest, one per resource, with this limit each.
                              // Guarantees every source contributes — important for NotebookLM-style project scope where
                              // a single global topK can starve smaller / less semantically dominant sources.
}

export interface RetrievedChunkPayload {
    id: string;
    resourceId: string;
    resourceTitle: string;
    resourceAuthor: string;
    chunkIndex: number;
    text: string;
    metadata: {
        page?: number;
        section?: string;
        sectionPath?: string[];
        chunkType?: string;
    };
    score: number;
    sectionBreadcrumb: string;
    /** Whether this source may be cited publicly. Joined from library_resources at retrieval time. */
    publiclyCitable?: boolean;
}

const EMBEDDING_MODEL = 'models/gemini-embedding-001';
const CHUNK_COLLECTION = 'document_chunks';

/**
 * Callable Cloud Function: semantic retrieval from the Phase 2 RAG index.
 *
 *   1. Embed the user's query with Gemini (task=RETRIEVAL_QUERY)
 *   2. Firestore findNearest across document_chunks
 *   3. Optional filter by `stores` (tutor's corpus scope)
 *   4. Return chunks with full metadata (author, title, page, section)
 *
 * This replaces the need for Gemini File Search + annotation markers.
 * Citations are built from metadata, not parsed from text.
 */
export const retrieveChunks = onCall<RetrieveRequest>(
    {
        ...appCheckCallableOptions(),
        region: 'us-central1',
        memory: '1GiB',
        timeoutSeconds: 60,
        secrets: ['GEMINI_API_KEY'],
    },
    async (request): Promise<{ chunks: RetrievedChunkPayload[] }> => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Sign-in required');
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new HttpsError('failed-precondition', 'GEMINI_API_KEY not configured');

        const { query: queryText, stores = [], corpusIds = [], userId, resourceIds = [], topK = 10, minSimilarity = 0, perResourceTopK = 0 } = request.data;
        if (!queryText || typeof queryText !== 'string' || !queryText.trim()) {
            return { chunks: [] };
        }

        // Security: if userId is specified, it must match the authenticated caller.
        // This prevents an admin-impersonation scenario where a compromised client
        // could read another user's private chunks.
        if (userId && userId !== request.auth.uid) {
            throw new HttpsError('permission-denied', 'userId must match authenticated user');
        }

        const db = getFirestore();

        // Resolve store keys from agent.corpusIds (legacy URIs) if provided
        let effectiveStores = [...stores];
        if (corpusIds.length > 0) {
            const resolvedKeys = await resolveStoreKeysFromCorpusIds(db, corpusIds);
            effectiveStores = Array.from(new Set([...effectiveStores, ...resolvedKeys]));
            console.log(`[RetrieveChunks] Resolved ${corpusIds.length} corpusIds → ${resolvedKeys.length} store keys: ${resolvedKeys.join(', ')}`);
        }

        try {
            // 1. Embed the query (task=RETRIEVAL_QUERY gives best retrieval quality)
            const queryEmbedding = await embedQuery(queryText, apiKey);

            // 2. Build Firestore query with optional filters.
            //    Scope rules:
            //      - stores: Core Library scope (shared, curated content)
            //      - userId: Personal Library scope (only the user's uploads)
            //      - resourceIds: Project scope (explicit whitelist, e.g. a research project)
            //    Filters combine via AND — specify only what you need for the caller's intent.
            //
            // Per-source mode: when `perResourceTopK > 0` and `resourceIds` are provided, we
            // run N parallel findNearest queries (one per resourceId) instead of a single
            // global query. This guarantees every source gets to contribute its top-K — a
            // single global query can starve sources whose chunks happen to score lower than
            // dominant sources, even when those sources are highly relevant to the user's
            // intent.
            const usePerSource = perResourceTopK > 0 && resourceIds.length > 0;

            let docsToProcess: FirebaseFirestore.QueryDocumentSnapshot[] = [];
            // Per-source mode skips the minSimilarity filter further down: the user has
            // explicitly curated this set of sources, so we want each to contribute its
            // best-K regardless of absolute score. A global threshold makes sense for
            // unscoped queries (noise filtering) but starves dense commentaries that
            // match abstract queries weakly even when they're the most authoritative source.
            let skipMinSimilarity = false;
            if (usePerSource) {
                skipMinSimilarity = true;
                // Strategy: we can't run one findNearest per resourceId because Firestore's
                // vector index for `resourceId == X` alone doesn't exist (and creating it
                // would mean managing yet another vector index). Instead, we issue ONE
                // findNearest with the existing (userId, resourceId IN [...]) prefix index
                // but pull a wider pool (perResourceTopK * N * 5, capped at 100). Then we
                // group the results by resourceId in code and take perResourceTopK per
                // source. This guarantees per-source fairness within the pool — no source
                // gets starved unless it has zero chunks among the wider net.
                const cappedIds = resourceIds.slice(0, 30);
                const widerLimit = Math.min(100, Math.max(perResourceTopK * cappedIds.length * 5, 30));
                // IMPORTANT: keep this where-clause order identical to the single-shot path
                // below (stores → userId → resourceId). Firestore vector index selection is
                // sensitive to the chain order; matching the working shape lets us reuse the
                // existing index instead of creating a new (resourceId, userId, embedding)
                // composite.
                let q: FirebaseFirestore.Query = db.collection(CHUNK_COLLECTION);
                if (effectiveStores.length > 0) {
                    q = q.where('stores', 'array-contains-any', effectiveStores.slice(0, 30));
                }
                if (userId) {
                    q = q.where('userId', '==', userId);
                }
                q = q.where('resourceId', 'in', cappedIds);
                const snap = await q.findNearest({
                    vectorField: 'embedding',
                    queryVector: queryEmbedding,
                    limit: widerLimit,
                    distanceMeasure: 'COSINE',
                    distanceResultField: '_distance',
                }).get();

                // Group by resourceId; take top-K per source. Snap docs are already sorted
                // by similarity so the first perResourceTopK we see per source ARE its top-K.
                const grouped = new Map<string, FirebaseFirestore.QueryDocumentSnapshot[]>();
                for (const d of snap.docs) {
                    const rid = (d.data().resourceId as string | undefined) ?? '';
                    if (!rid) continue;
                    let arr = grouped.get(rid);
                    if (!arr) {
                        arr = [];
                        grouped.set(rid, arr);
                    }
                    if (arr.length < perResourceTopK) arr.push(d);
                }
                docsToProcess = Array.from(grouped.values()).flat();

                const perSourceCounts: Record<string, number> = {};
                for (const rid of cappedIds) {
                    perSourceCounts[rid.substring(0, 8)] = grouped.get(rid)?.length ?? 0;
                }
                console.log(`[RetrieveChunks] per-source counts (pool=${snap.size}, kept=${docsToProcess.length}): ${JSON.stringify(perSourceCounts)}`);
            } else {
                let q: FirebaseFirestore.Query = db.collection(CHUNK_COLLECTION);
                if (effectiveStores.length > 0) {
                    q = q.where('stores', 'array-contains-any', effectiveStores.slice(0, 30));
                }
                if (userId) {
                    q = q.where('userId', '==', userId);
                }
                if (resourceIds.length > 0) {
                    // Firestore limits array-contains-any / in to 30 values; documents larger than
                    // that should be sliced client-side before calling.
                    q = q.where('resourceId', 'in', resourceIds.slice(0, 30));
                }

                const vectorQuery = q.findNearest({
                    vectorField: 'embedding',
                    queryVector: queryEmbedding,
                    limit: topK,
                    distanceMeasure: 'COSINE',
                    distanceResultField: '_distance',
                });
                const snap = await vectorQuery.get();
                docsToProcess = snap.docs;
            }

            const scopeDesc = [
                effectiveStores.length ? `stores=${effectiveStores.join(',')}` : null,
                userId ? `userId=${userId.substring(0, 8)}...` : null,
                resourceIds.length ? `resourceIds=${resourceIds.length}` : null,
                usePerSource ? `perResourceTopK=${perResourceTopK}` : null,
            ].filter(Boolean).join(' | ') || 'ALL';
            console.log(`[RetrieveChunks] query="${queryText.substring(0, 60)}..." | scope: ${scopeDesc} | found=${docsToProcess.length}`);

            // Build a synthetic snapshot-like object for the rest of the pipeline
            const snapshot = { docs: docsToProcess, size: docsToProcess.length };

            // 4. Pre-pass: collect unique resourceIds to join with library_resources for
            //    the publiclyCitable flag. One getAll() batch is cheap (<20 docs typical).
            const uniqueResourceIds = Array.from(new Set(
                snapshot.docs.map(d => d.data().resourceId).filter(Boolean)
            )) as string[];
            const citableMap = new Map<string, boolean>();
            if (uniqueResourceIds.length > 0) {
                const refs = uniqueResourceIds.map(id => db.collection('library_resources').doc(id));
                const docs = await db.getAll(...refs);
                for (const d of docs) {
                    if (d.exists) {
                        citableMap.set(d.id, d.data()?.publiclyCitable === true);
                    }
                }
            }

            // 5. Map to payload
            const chunks: RetrievedChunkPayload[] = [];
            const droppedByMinSim: Record<string, number> = {};
            // El índice tiene chunks escritos ANTES de que existiera el
            // saneamiento, y re-indexar 81 recursos no es instantáneo. Sanear
            // en la salida cubre a esos desde hoy: es el último punto por el
            // que el texto pasa antes de entrar al prompt del modelo y a la
            // cita que lee el pastor. Sobre un chunk ya limpio no cuesta nada.
            let sanitizedOnRead = 0;
            for (const doc of snapshot.docs) {
                const data = doc.data();
                const distance = (data._distance as number) ?? 0;
                const score = Math.max(0, 1 - (distance / 2));  // cosine distance [0,2] → sim [0,1]

                if (!skipMinSimilarity && minSimilarity && score < minSimilarity) {
                    const key = (data.resourceId ?? 'unknown').substring(0, 8);
                    droppedByMinSim[key] = (droppedByMinSim[key] ?? 0) + 1;
                    continue;
                }

                const sectionPath = (data.metadata?.sectionPath as string[]) ?? [];
                const sanitized = sanitizeExtractedText(data.text ?? '');
                if (sanitized.report.removed > 0) sanitizedOnRead += sanitized.report.removed;
                chunks.push({
                    id: doc.id,
                    resourceId: data.resourceId,
                    resourceTitle: data.resourceTitle ?? 'Documento sin título',
                    resourceAuthor: data.resourceAuthor ?? 'Autor desconocido',
                    chunkIndex: data.chunkIndex ?? 0,
                    text: sanitized.text,
                    metadata: {
                        page: data.metadata?.page,
                        section: data.metadata?.section,
                        sectionPath,
                        chunkType: data.metadata?.chunkType,
                    },
                    score,
                    sectionBreadcrumb: sectionPath.length > 0
                        ? sectionPath.join(' › ')
                        : (data.metadata?.section ?? ''),
                    publiclyCitable: citableMap.get(data.resourceId) ?? false,
                });
            }

            // Per-source mode returns chunks grouped by source (each source's top-K back to back).
            // Sort the combined list by similarity so downstream consumers see them in the
            // same descending-score order as the single-shot path.
            chunks.sort((a, b) => b.score - a.score);

            if (sanitizedOnRead > 0) {
                console.log(`🧼 [RetrieveChunks] ${sanitizedOnRead} caracteres invisibles removidos en lectura — hay chunks indexados antes del saneo; conviene reindexar esos recursos.`);
            }

            if (Object.keys(droppedByMinSim).length > 0) {
                console.log(`[RetrieveChunks] minSim=${minSimilarity} dropped: ${JSON.stringify(droppedByMinSim)}`);
            }
            const finalCounts: Record<string, number> = {};
            for (const c of chunks) {
                const k = c.resourceId.substring(0, 8);
                finalCounts[k] = (finalCounts[k] ?? 0) + 1;
            }
            console.log(`[RetrieveChunks] returning ${chunks.length} chunks; per-resource: ${JSON.stringify(finalCounts)}`);

            return { chunks };
        } catch (err: any) {
            const msg = err?.message ?? 'Unknown error';
            console.error('[RetrieveChunks] Error:', msg);
            console.error('[RetrieveChunks] Stack:', err?.stack);
            // Missing vector index is a common first-time error — surface it clearly.
            if (/FAILED_PRECONDITION/i.test(msg) || /index.*required/i.test(msg)) {
                throw new HttpsError(
                    'failed-precondition',
                    'Vector index for document_chunks.embedding is missing. Create it via gcloud: see docs.'
                );
            }
            throw new HttpsError('internal', `Retrieval failed: ${msg}`);
        }
    }
);

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Reverse-lookup agent corpus URIs → store keys using config/coreLibraryStores.
 *
 *   agent.corpusIds = ["fileSearchStores/dos-filos-exegesis-ah6czkj2qrr5", ...]
 *   config.stores = { exegesis: "fileSearchStores/dos-filos-exegesis-ah6czkj2qrr5", ... }
 *
 * Returns the matching keys (e.g. ["exegesis", ...]).
 */
async function resolveStoreKeysFromCorpusIds(
    db: FirebaseFirestore.Firestore,
    corpusIds: string[]
): Promise<string[]> {
    try {
        const configSnap = await db.doc('config/coreLibraryStores').get();
        if (!configSnap.exists) return [];
        const storesMap = (configSnap.data()?.stores ?? {}) as Record<string, string | null>;

        const resolved: string[] = [];
        for (const corpusId of corpusIds) {
            for (const [key, uri] of Object.entries(storesMap)) {
                if (uri === corpusId) {
                    resolved.push(key);
                    break;
                }
            }
        }
        return resolved;
    } catch (err) {
        console.warn('[RetrieveChunks] Could not resolve store keys:', err);
        return [];
    }
}

export async function embedQuery(text: string, apiKey: string): Promise<number[]> {
    const url = `https://generativelanguage.googleapis.com/v1beta/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`;
    const body = {
        model: EMBEDDING_MODEL,
        content: { parts: [{ text }] },
        taskType: 'RETRIEVAL_QUERY',
        // Must match the dimensionality used when indexing (see indexStructuredDocument.ts).
        outputDimensionality: 768,
    };
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Gemini embed query failed (${res.status}): ${errText.substring(0, 300)}`);
    }
    const json = await res.json() as { embedding?: { values: number[] } };
    if (!json.embedding?.values) throw new Error('Gemini embed response missing values');
    return json.embedding.values;
}

// Satisfies unused-import linter for types exported elsewhere
export const _types = {} as { FieldPath: typeof FieldPath };
