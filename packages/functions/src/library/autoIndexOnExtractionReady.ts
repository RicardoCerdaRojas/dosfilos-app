import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { indexResourceChunks } from './indexStructuredDocument';

/**
 * Firestore trigger: when a library_resource's extraction completes with LlamaParse,
 * automatically build its Phase 2 RAG index (chunks + embeddings).
 *
 * Fires when:
 *   - `textExtractionStatus` transitions to 'ready' (from anything else)
 *   - `extractionVersion` is '3.0-llamaparse'
 *   - `structuredContentUrl` is set
 *   - `indexerVersion` is not already the current version (avoids loops on re-trigger)
 *
 * This replaces the need for users to click "Indexar" manually after upload.
 * Admin can still re-index via the callable `indexStructuredDocument` (with force=true)
 * for reindexing after prompt/embedding changes.
 */
export const autoIndexOnExtractionReady = onDocumentUpdated(
    {
        document: 'library_resources/{resourceId}',
        region: 'us-central1',
        memory: '2GiB',
        // Firestore triggers are capped at 540s by the platform. Very large documents
        // (>500 chunks) may exceed this window due to embedding rate limits. When that
        // happens the function errors out but leaves indexingStatus='failed'; the user
        // can retry manually via the callable `indexStructuredDocument` (which supports
        // up to 900s for long-running reindexes).
        timeoutSeconds: 540,
        secrets: ['GEMINI_API_KEY'],
    },
    async (event) => {
        const before = event.data?.before.data();
        const after = event.data?.after.data();
        if (!before || !after) return;

        const resourceId = event.params.resourceId;

        // Trigger conditions — all must be true
        const wasNotReady = before.textExtractionStatus !== 'ready';
        const isNowReady = after.textExtractionStatus === 'ready';
        // Either extraction path (LlamaParse premium or Gemini standard) emits
        // the same `<!-- page: N -->` markdown contract that the indexer needs.
        const SUPPORTED_VERSIONS = ['3.0-llamaparse', '4.0-gemini-standard'];
        const isStructuredExtraction = SUPPORTED_VERSIONS.includes(after.extractionVersion);
        const hasStructuredContent = !!after.structuredContentUrl;
        const INDEXER_VERSION_CURRENT = '2.0-structured';
        const needsIndex = after.indexerVersion !== INDEXER_VERSION_CURRENT;

        if (!(wasNotReady && isNowReady)) return;
        if (!isStructuredExtraction) {
            console.log(`[AutoIndex] ${resourceId}: extraction version ${after.extractionVersion} not supported for auto-index; skipping`);
            return;
        }
        if (!hasStructuredContent) {
            console.log(`[AutoIndex] ${resourceId}: no structuredContentUrl; skipping`);
            return;
        }
        if (!needsIndex) {
            console.log(`[AutoIndex] ${resourceId}: already indexed at ${INDEXER_VERSION_CURRENT}; skipping`);
            return;
        }

        const geminiKey = process.env.GEMINI_API_KEY;
        if (!geminiKey) {
            console.error(`[AutoIndex] ${resourceId}: GEMINI_API_KEY not configured; cannot index`);
            return;
        }

        console.log(`[AutoIndex] ${resourceId}: extraction ready — starting automatic Phase 2 indexing`);
        try {
            const result = await indexResourceChunks(resourceId, { force: false, geminiKey });
            if ('skipped' in result && result.skipped) {
                console.log(`[AutoIndex] ${resourceId}: skipped (${result.reason})`);
            } else if ('chunkCount' in result) {
                console.log(`[AutoIndex] ✅ ${resourceId}: indexed ${result.chunkCount} chunks`);
            }
        } catch (err: any) {
            // Errors are already logged + persisted as `indexingStatus: 'failed'` by
            // indexResourceChunks. We log again here for trigger-level observability.
            console.error(`[AutoIndex] ❌ ${resourceId}: ${err?.message ?? err}`);
        }
    }
);
