import { getFunctions, httpsCallable } from 'firebase/functions';

/**
 * RetrievedChunk — a chunk retrieved by semantic search, with full metadata and score.
 * Mirror of the Cloud Function return shape.
 */
export interface RetrievedChunk {
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

export interface RetrievalOptions {
    topK?: number;
    stores?: string[];    // Preferred: store keys (e.g. 'exegesis')
    corpusIds?: string[]; // Legacy: agent.corpusIds (store URIs); server reverse-resolves to keys
    minSimilarity?: number;
}

/**
 * CoreLibraryRAGService — client-side wrapper around the server-side retrieval.
 *
 * Actual vector search runs in the `retrieveChunks` Cloud Function using
 * firebase-admin's findNearest (the client SDK v10 doesn't ship it yet).
 * This service just dispatches the call and formats the result.
 */
export class CoreLibraryRAGService {
    /**
     * Retrieve top-K most semantically similar chunks.
     */
    async retrieve(
        queryText: string,
        options: RetrievalOptions = {}
    ): Promise<RetrievedChunk[]> {
        if (!queryText.trim()) return [];

        try {
            const functions = getFunctions();
            const retrieveFn = httpsCallable(functions, 'retrieveChunks', {
                timeout: 30_000,  // 30s — retrieval should be fast
            });

            const response = await retrieveFn({
                query: queryText,
                stores: options.stores ?? [],
                corpusIds: options.corpusIds ?? [],
                topK: options.topK ?? 10,
                minSimilarity: options.minSimilarity ?? 0,
            });

            const data = response.data as { chunks: RetrievedChunk[] };
            return data.chunks ?? [];
        } catch (err: any) {
            console.warn('[CoreLibraryRAG] retrieval failed, returning empty:', err?.message ?? err);
            return [];
        }
    }

    /**
     * Format retrieved chunks as a context block for the LLM prompt.
     * Structured so Gemini can cite naturally: [Fuente N: Autor, Título, p. N, Sección].
     */
    static formatContextForPrompt(chunks: RetrievedChunk[]): string {
        if (chunks.length === 0) return '';
        return chunks
            .map((c, i) => {
                const page = c.metadata.page ? `p. ${c.metadata.page}` : '';
                const section = c.sectionBreadcrumb ? `§ ${c.sectionBreadcrumb}` : '';
                const locator = [page, section].filter(Boolean).join(', ');
                const header = locator
                    ? `[Fuente ${i + 1}: ${c.resourceAuthor}, "${c.resourceTitle}", ${locator}]`
                    : `[Fuente ${i + 1}: ${c.resourceAuthor}, "${c.resourceTitle}"]`;
                return `${header}\n${c.text}`;
            })
            .join('\n\n---\n\n');
    }
}

export const coreLibraryRAGService = new CoreLibraryRAGService();
