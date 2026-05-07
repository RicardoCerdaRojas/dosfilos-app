import { getFunctions, httpsCallable } from 'firebase/functions';
import type {
    IRelevantChunkRetriever,
    RetrieveRelevantChunksInput,
    RetrieveRelevantChunksOutput,
    RetrievedChunk,
} from '@dosfilos/domain';

/**
 * Mirror of `retrieveChunks` cloud function payload — kept local so
 * the infrastructure package doesn't depend on the functions package
 * types. Same shape `RetrieveChunksExcerptExtractor` consumes.
 */
interface RetrievedChunkPayload {
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

/**
 * `IRelevantChunkRetriever` implementation that delegates to the
 * existing `retrieveChunks` cloud function — same callable Faculty +
 * the corpus excerpt extractor use. The verifier sends the citation's
 * evidence sentence as the embedding query and constrains the search
 * to the cited resource via `resourceIds: [resourceId]` +
 * `perResourceTopK`.
 *
 * No retry logic here — the callable already runs server-side and a
 * verification storm of 5-10 cites tolerates a single failure (the
 * verifier downgrades to manual-pending for that one cite).
 */
export class RetrieveChunksRelevantChunkRetriever implements IRelevantChunkRetriever {
    async retrieve(input: RetrieveRelevantChunksInput): Promise<RetrieveRelevantChunksOutput> {
        if (!input.query || input.query.trim().length === 0) {
            return { chunks: [] };
        }
        if (!input.userId || !input.resourceId) {
            return { chunks: [] };
        }

        const functions = getFunctions();
        const retrieveFn = httpsCallable<unknown, { chunks: RetrievedChunkPayload[] }>(
            functions,
            'retrieveChunks',
            { timeout: 30_000 },
        );
        const response = await retrieveFn({
            query: input.query,
            userId: input.userId,
            resourceIds: [input.resourceId],
            perResourceTopK: Math.max(1, Math.min(20, input.topK)),
        });
        const raw = response.data?.chunks ?? [];

        const chunks: RetrievedChunk[] = raw.map(c => ({
            text: c.text,
            page: typeof c.metadata?.page === 'number' ? c.metadata.page : null,
            section: typeof c.metadata?.section === 'string' ? c.metadata.section : null,
            score: typeof c.score === 'number' ? c.score : 0,
        }));

        return { chunks };
    }
}
