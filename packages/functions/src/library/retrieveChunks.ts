import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldPath } from 'firebase-admin/firestore';

interface RetrieveRequest {
    query: string;
    stores?: string[];       // Core Library store keys (e.g. ['exegesis', 'tutor-griego'])
    corpusIds?: string[];    // Agent's legacy corpus URIs (fileSearchStores/...); server reverse-resolves to keys
    topK?: number;           // Default 10
    minSimilarity?: number;  // Default 0
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

        const { query: queryText, stores = [], corpusIds = [], topK = 10, minSimilarity = 0 } = request.data;
        if (!queryText || typeof queryText !== 'string' || !queryText.trim()) {
            return { chunks: [] };
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

            // 2. Build Firestore query with optional store filter
            let q: FirebaseFirestore.Query = db.collection(CHUNK_COLLECTION);
            if (effectiveStores.length > 0) {
                q = q.where('stores', 'array-contains-any', effectiveStores.slice(0, 30));
            }

            // 3. findNearest — Firestore native vector search
            const vectorQuery = q.findNearest({
                vectorField: 'embedding',
                queryVector: queryEmbedding,
                limit: topK,
                distanceMeasure: 'COSINE',
                distanceResultField: '_distance',
            });

            const snapshot = await vectorQuery.get();
            console.log(`[RetrieveChunks] query="${queryText.substring(0, 60)}..." | stores=${effectiveStores.join(',') || 'ALL'} | found=${snapshot.size}`);

            // 4. Map to payload
            const chunks: RetrievedChunkPayload[] = [];
            for (const doc of snapshot.docs) {
                const data = doc.data();
                const distance = (data._distance as number) ?? 0;
                const score = Math.max(0, 1 - (distance / 2));  // cosine distance [0,2] → sim [0,1]

                if (minSimilarity && score < minSimilarity) continue;

                const sectionPath = (data.metadata?.sectionPath as string[]) ?? [];
                chunks.push({
                    id: doc.id,
                    resourceId: data.resourceId,
                    resourceTitle: data.resourceTitle ?? 'Documento sin título',
                    resourceAuthor: data.resourceAuthor ?? 'Autor desconocido',
                    chunkIndex: data.chunkIndex ?? 0,
                    text: data.text ?? '',
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
                });
            }

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

async function embedQuery(text: string, apiKey: string): Promise<number[]> {
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
