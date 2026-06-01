import { getFunctions, httpsCallable } from 'firebase/functions';
import type { ConcreteResponseMode } from '@dosfilos/domain';

/**
 * Retrieval tuning per response mode.
 *
 * Rationale:
 *  - concise/layperson: fewer chunks, higher similarity bar — short answers get
 *    muddled when the model sees too much context.
 *  - detailed: balanced default.
 *  - academic: wider net + lower bar — exhaustive analysis benefits from more
 *    potentially-relevant material, even if loosely related.
 *  - pastoral: medium-small — scripture-forward answers focus on 1–2 passages
 *    plus a bit of theological backdrop.
 */
const RETRIEVAL_CONFIG_BY_MODE: Record<ConcreteResponseMode, { topK: number; minSimilarity: number }> = {
    concise: { topK: 4, minSimilarity: 0.40 },
    detailed: { topK: 10, minSimilarity: 0.30 },
    academic: { topK: 15, minSimilarity: 0.25 },
    pastoral: { topK: 6, minSimilarity: 0.35 },
    layperson: { topK: 5, minSimilarity: 0.35 },
};

export function getRetrievalConfigForMode(mode: ConcreteResponseMode): { topK: number; minSimilarity: number } {
    return RETRIEVAL_CONFIG_BY_MODE[mode] ?? RETRIEVAL_CONFIG_BY_MODE.detailed;
}

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
    /** Whether the underlying source may be cited to non-admin users. */
    publiclyCitable?: boolean;
}

export interface RetrievalOptions {
    topK?: number;
    stores?: string[];         // Core Library store keys (e.g. 'exegesis')
    corpusIds?: string[];      // Legacy: agent.corpusIds (store URIs); server reverse-resolves to keys
    userId?: string;           // Personal Library scope — restricts to this user's uploads
    resourceIds?: string[];    // Project scope — restricts to specific documents
    minSimilarity?: number;
    /**
     * When set together with `resourceIds`, runs one findNearest per resource (in parallel)
     * with this limit each, instead of a single global findNearest with topK.
     *
     * Use this for project scope so every curated source contributes its best chunks.
     * A single global query can starve sources whose chunks score lower than dominant
     * sources — even when those sources are highly relevant to the user's intent.
     */
    perResourceTopK?: number;
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
                userId: options.userId,
                resourceIds: options.resourceIds ?? [],
                topK: options.topK ?? 10,
                minSimilarity: options.minSimilarity ?? 0,
                perResourceTopK: options.perResourceTopK ?? 0,
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
     *
     * Citation protection (legal):
     *   Sources whose `publiclyCitable !== true` are anonymised in the header
     *   shown to the model — only the protection sentinel is exposed instead
     *   of `Autor, "Título"`. The chunk TEXT is still included verbatim (the
     *   model needs the content to answer); only the bibliographic attribution
     *   is masked, so the model cannot leak author/title in its response.
     *
     *   Cleared sources (admin opted them in via `publiclyCitable=true`) keep
     *   the rich `[Fuente N: Autor, Título, p. N, §Sección]` header.
     *
     * The protected sentinel uses a marker pattern (`__PROTECTED__`) the
     * downstream prompt rules and the client-side extractor both recognise,
     * so the model NEVER produces an inline `(Author, "Title")` for protected
     * material — and if it leaks one, the extractor strips it defensively.
     *
     * `options.revealProtected` lifts the mask for ALL sources. This is the
     * super-admin path: the founder needs to see the real attribution of
     * every source the answer drew on (internal reference, not public
     * distribution — consistent with the client-side `isAdmin` gate in
     * `extractCitations`, which already declines to strip those citations).
     * Default `false` — the legal masking stays on for every normal user.
     */
    static formatContextForPrompt(
        chunks: RetrievedChunk[],
        language: 'es' | 'en' = 'es',
        options: { revealProtected?: boolean } = {},
    ): string {
        if (chunks.length === 0) return '';
        const sourceWord = language === 'en' ? 'Source' : 'Fuente';
        const protectedLabel = language === 'en'
            ? 'Curated material · internal reference (do NOT cite inline)'
            : 'Material especializado · referencia interna (NO citar inline)';

        return chunks
            .map((c, i) => {
                const cleared = c.publiclyCitable === true || options.revealProtected === true;
                let header: string;
                if (cleared) {
                    const page = c.metadata.page ? `p. ${c.metadata.page}` : '';
                    const section = c.sectionBreadcrumb ? `§ ${c.sectionBreadcrumb}` : '';
                    const locator = [page, section].filter(Boolean).join(', ');
                    header = locator
                        ? `[${sourceWord} ${i + 1}: ${c.resourceAuthor}, "${c.resourceTitle}", ${locator}]`
                        : `[${sourceWord} ${i + 1}: ${c.resourceAuthor}, "${c.resourceTitle}"]`;
                } else {
                    header = `[${sourceWord} ${i + 1}: ${protectedLabel}]`;
                }
                return `${header}\n${c.text}`;
            })
            .join('\n\n---\n\n');
    }
}

export const coreLibraryRAGService = new CoreLibraryRAGService();
