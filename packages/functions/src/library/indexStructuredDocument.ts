import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getStorage } from 'firebase-admin/storage';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { chunkStructuredMarkdown } from './markdownChunker';

interface IndexRequest {
    resourceId: string;
    force?: boolean;  // Reindex even if already indexed with current version
}

const INDEXER_VERSION = '2.0-structured';
const EMBEDDING_MODEL = 'models/gemini-embedding-001';
const CHUNK_COLLECTION = 'document_chunks';
const EMBEDDING_BATCH_SIZE = 20;  // Gemini batch embedding limit

/**
 * Callable Cloud Function: builds the Phase 2 RAG index for a single library_resource.
 *
 * Pipeline:
 *   1. Read structured.md from Cloud Storage (produced by LlamaParse)
 *   2. Chunk it semantically (respecting pages, sections, max size)
 *   3. Generate Gemini embeddings (batched)
 *   4. Delete any previous chunks for this resource
 *   5. Upsert new chunks to Firestore document_chunks collection
 *
 * The resulting chunks have rich metadata: author, title, page, section breadcrumb,
 * stores (for scoping queries to tutors' corpusStores).
 */
export const indexStructuredDocument = onCall<IndexRequest>(
    {
        region: 'us-central1',
        memory: '2GiB',
        timeoutSeconds: 900,
        secrets: ['GEMINI_API_KEY'],
    },
    async (request) => {
        console.log(`[IndexStructured] Called by ${request.auth?.token?.email ?? 'unauthenticated'}`);

        if (!request.auth || request.auth.token?.email !== 'rdocerda@gmail.com') {
            throw new HttpsError('permission-denied', 'Only admin can index documents');
        }

        const geminiKey = process.env.GEMINI_API_KEY;
        if (!geminiKey) throw new HttpsError('failed-precondition', 'GEMINI_API_KEY not configured');

        const { resourceId, force = false } = request.data;
        if (!resourceId) throw new HttpsError('invalid-argument', 'resourceId is required');

        const db = getFirestore();
        const storage = getStorage();
        const resourceRef = db.collection('library_resources').doc(resourceId);
        const snap = await resourceRef.get();
        if (!snap.exists) throw new HttpsError('not-found', `Resource ${resourceId} not found`);

        const data = snap.data()!;

        // Preconditions
        if (data.extractionVersion !== '3.0-llamaparse') {
            throw new HttpsError(
                'failed-precondition',
                `Resource ${resourceId} must be extracted with LlamaParse first (current: ${data.extractionVersion ?? 'unknown'})`
            );
        }
        if (!data.structuredContentUrl) {
            throw new HttpsError('failed-precondition', `Resource ${resourceId} has no structuredContentUrl`);
        }
        if (!force && data.indexerVersion === INDEXER_VERSION) {
            console.log(`[IndexStructured] ${resourceId} already indexed with ${INDEXER_VERSION}. Skipping.`);
            return { success: true, skipped: true, reason: 'already-indexed' };
        }

        const title: string = data.title ?? 'Documento sin título';
        const author: string = data.author ?? 'Autor desconocido';
        const userId: string = data.userId;
        const stores: string[] = data.coreStores ?? [];

        // 1. Download structured.md from Storage
        const { bucket: bucketName, path: mdPath } = parseFirebaseStorageLocation(
            data.structuredContentUrl,
            'dosfilosapp.firebasestorage.app'
        );
        if (!mdPath) throw new HttpsError('failed-precondition', `Bad structuredContentUrl: ${data.structuredContentUrl}`);

        const [mdBuffer] = await storage.bucket(bucketName).file(mdPath).download();
        let markdown = mdBuffer.toString('utf-8');
        console.log(`[IndexStructured] ${title}: downloaded ${markdown.length} chars of structured markdown`);

        // 2. Chunk semantically
        let chunks = chunkStructuredMarkdown(markdown, {
            maxChars: 2000,
            minChars: 200,
            overlapChars: 150,
        });
        console.log(`[IndexStructured] ${title}: produced ${chunks.length} chunks from structured.md`);

        // Fallback: if structured.md is too thin (e.g. old upload with empty p.md),
        // use the textContent stored in Firestore, which has [PAGE N] markers.
        if (chunks.length < 3 && data.textContent && data.textContent.length > 1000) {
            console.log(`[IndexStructured] ${title}: falling back to textContent (${data.textContent.length} chars)`);
            // Convert [PAGE N] markers to <!-- page: N --> so chunker recognizes them
            markdown = (data.textContent as string).replace(/\[PAGE\s+(\d+)\]/gi, '<!-- page: $1 -->');
            chunks = chunkStructuredMarkdown(markdown, {
                maxChars: 2000,
                minChars: 200,
                overlapChars: 150,
            });
            console.log(`[IndexStructured] ${title}: fallback produced ${chunks.length} chunks`);
        }

        if (chunks.length === 0) {
            return { success: true, chunkCount: 0, skipped: true, reason: 'empty-document' };
        }

        try {
            await resourceRef.update({
                indexingStatus: 'processing',
                updatedAt: new Date(),
            });

            // 3. Generate embeddings in batches
            console.log(`[IndexStructured] ${title}: embedding ${chunks.length} chunks...`);
            const embeddings = await embedChunksBatched(chunks.map(c => c.text), geminiKey);
            if (embeddings.length !== chunks.length) {
                throw new Error(`Embedding count mismatch: ${embeddings.length} vs ${chunks.length}`);
            }

            // 4. Delete previous chunks for this resource (safe: keeps index fresh on reprocess)
            await deleteExistingChunks(db, resourceId);

            // 5. Upsert new chunks — individual writes.
            // Firestore batched writes with vector embeddings trigger "Transaction too big"
            // because vector index updates have a high accounting cost per operation.
            // Individual writes are slower but robust. For 500 chunks this takes ~30-60s.
            const now = new Date();
            for (let i = 0; i < chunks.length; i++) {
                const c = chunks[i];
                const id = `${resourceId}_chunk_${i}`;
                await db.collection(CHUNK_COLLECTION).doc(id).set({
                    resourceId,
                    resourceTitle: title,
                    resourceAuthor: author,
                    userId,
                    chunkIndex: i,
                    text: c.text,
                    embedding: FieldValue.vector(embeddings[i]),
                    metadata: {
                        page: c.page,
                        section: c.section ?? null,
                        sectionPath: c.sectionPath,
                        chunkType: c.chunkType,
                        startChar: c.charStart,
                        endChar: c.charEnd,
                    },
                    stores,
                    indexerVersion: INDEXER_VERSION,
                    createdAt: now,
                });
                // Progress log every 25 chunks
                if ((i + 1) % 25 === 0 || i === chunks.length - 1) {
                    console.log(`[IndexStructured] written ${i + 1}/${chunks.length} chunks`);
                }
            }

            // Mark the resource as indexed
            await resourceRef.update({
                indexingStatus: 'ready',
                indexerVersion: INDEXER_VERSION,
                indexedChunkCount: chunks.length,
                indexedAt: now,
                needsReindex: false,
                updatedAt: now,
            });

            console.log(`[IndexStructured] ✅ ${title}: ${chunks.length} chunks indexed`);
            return {
                success: true,
                chunkCount: chunks.length,
                pageRange: {
                    min: Math.min(...chunks.map(c => c.page)),
                    max: Math.max(...chunks.map(c => c.page)),
                },
            };
        } catch (err: any) {
            const errorMessage = err?.message ?? 'Unknown error';
            console.error(`[IndexStructured] ❌ ${resourceId}: ${errorMessage}`);
            console.error('[IndexStructured] Stack:', err?.stack);
            await resourceRef.update({
                indexingStatus: 'failed',
                indexingError: errorMessage,
                updatedAt: new Date(),
            });
            throw new HttpsError('internal', `Indexing failed: ${errorMessage}`);
        }
    }
);

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Gemini embedding API — batched with rate limiting + retry.
 * Free tier has aggressive rate limits; we pace requests and retry on 429s.
 */
async function embedChunksBatched(texts: string[], apiKey: string): Promise<number[][]> {
    const all: number[][] = [];
    const PAUSE_BETWEEN_BATCHES_MS = 1200;  // ~50 RPM conservative
    for (let i = 0; i < texts.length; i += EMBEDDING_BATCH_SIZE) {
        const batch = texts.slice(i, i + EMBEDDING_BATCH_SIZE);
        const embeddings = await embedBatchWithRetry(batch, apiKey);
        all.push(...embeddings);
        if (i + EMBEDDING_BATCH_SIZE < texts.length) {
            await new Promise(resolve => setTimeout(resolve, PAUSE_BETWEEN_BATCHES_MS));
        }
    }
    return all;
}

/**
 * Embed a batch with exponential backoff retry on rate-limit (429) errors.
 */
async function embedBatchWithRetry(texts: string[], apiKey: string, maxRetries = 5): Promise<number[][]> {
    let lastErr: Error | null = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await embedBatch(texts, apiKey);
        } catch (err: any) {
            lastErr = err;
            const msg = err?.message ?? '';
            const is429 = /\(429\)/.test(msg) || /RESOURCE_EXHAUSTED/i.test(msg);
            const is5xx = /\(5\d{2}\)/.test(msg);
            if (!is429 && !is5xx) throw err;   // Non-retryable errors propagate
            if (attempt === maxRetries) break;

            // Exponential backoff: 2s, 4s, 8s, 16s, 32s
            const waitMs = Math.min(32_000, 2_000 * Math.pow(2, attempt));
            console.log(`[IndexStructured] Rate limited (attempt ${attempt + 1}/${maxRetries + 1}). Waiting ${waitMs / 1000}s…`);
            await new Promise(resolve => setTimeout(resolve, waitMs));
        }
    }
    throw lastErr ?? new Error('Embedding failed after retries');
}

async function embedBatch(texts: string[], apiKey: string): Promise<number[][]> {
    const url = `https://generativelanguage.googleapis.com/v1beta/${EMBEDDING_MODEL}:batchEmbedContents?key=${apiKey}`;
    const body = {
        requests: texts.map(text => ({
            model: EMBEDDING_MODEL,
            content: { parts: [{ text }] },
            taskType: 'RETRIEVAL_DOCUMENT',
            // gemini-embedding-001 defaults to 3072 dims (exceeds Firestore's 2048 cap).
            // We request 768 dims to match our Firestore vector index configuration.
            outputDimensionality: 768,
        })),
    };

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Gemini embedding failed (${res.status}): ${errText.substring(0, 500)}`);
    }

    const json = await res.json() as { embeddings?: Array<{ values: number[] }> };
    if (!json.embeddings) throw new Error('Gemini embedding response missing embeddings field');
    return json.embeddings.map(e => e.values);
}

async function deleteExistingChunks(
    db: FirebaseFirestore.Firestore,
    resourceId: string
): Promise<void> {
    const snap = await db
        .collection(CHUNK_COLLECTION)
        .where('resourceId', '==', resourceId)
        .get();

    if (snap.empty) return;
    console.log(`[IndexStructured] Deleting ${snap.size} previous chunks for ${resourceId}`);

    // Individual deletes to avoid "Transaction too big" when vector index updates
    // are expensive. Batching 500 deletes with vector index reindexing overflows.
    for (let i = 0; i < snap.docs.length; i++) {
        await snap.docs[i].ref.delete();
        if ((i + 1) % 50 === 0 || i === snap.docs.length - 1) {
            console.log(`[IndexStructured] deleted ${i + 1}/${snap.docs.length} old chunks`);
        }
    }
}

function parseFirebaseStorageLocation(
    url: string,
    defaultBucket: string
): { bucket: string; path: string } {
    if (!url) return { bucket: defaultBucket, path: '' };
    const gsMatch = url.match(/^gs:\/\/([^/]+)\/(.+)$/);
    if (gsMatch) return { bucket: gsMatch[1], path: decodeURIComponent(gsMatch[2]) };
    const fbMatch = url.match(/\/v0\/b\/([^/]+)\/o\/([^?]+)/);
    if (fbMatch) return { bucket: fbMatch[1], path: decodeURIComponent(fbMatch[2]) };
    const gcsMatch = url.match(/^https?:\/\/storage\.googleapis\.com\/([^/]+)\/(.+?)(\?|$)/);
    if (gcsMatch) return { bucket: gcsMatch[1], path: decodeURIComponent(gcsMatch[2]) };
    return { bucket: defaultBucket, path: '' };
}
