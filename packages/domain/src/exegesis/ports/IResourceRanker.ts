import type { PassageReference } from '../../bible/canon/passage-reference';

/**
 * Semantic ranking of a user's library resources against an exegetical
 * paper. Powers the v1.7 paper-corpus smart-match dialog (Sprint 2 /
 * Fase B): when the user opens "extract from library" we pre-rank
 * their resources by relevance to the paper's passage so the top
 * matches are pre-selected and the rest can be hidden behind a toggle.
 *
 * Implementations talk to the chunks/embeddings store (today: the
 * `retrieveChunks` cloud function with `userId` scope, Firestore
 * findNearest under the hood). The port stays narrow on purpose —
 * the use case orchestrates intersecting the result with the Fase A
 * declarative metadata (`coversBibleBooks` + `scope`).
 *
 * Latency budget: one embedding (~200ms) + one vector search (~500ms-1s)
 * ≈ 1-1.5s end-to-end. Acceptable for a dialog open, but the UI MUST
 * render a skeleton while waiting — silent waiting at this latency
 * feels broken.
 */
export interface IResourceRanker {
    rank(input: RankResourcesInput): Promise<RankResourcesResult>;
}

export interface RankResourcesInput {
    /**
     * Authenticated user. Required so `retrieveChunks` can scope the
     * search to the user's personal library — admin-impersonation is
     * rejected at the callable level.
     */
    userId: string;
    /**
     * Paper's passage. Drives query construction (formatted reference
     * is the dominant relevance signal because commentary chunks
     * contain `[1:1]`-style anchors in their text).
     */
    passage: PassageReference;
    /**
     * Optional free-text framing for the paper. Concatenated to the
     * query (truncated) to bias retrieval toward the angle the
     * student wants. Pass null when the paper has no brief — the
     * implementation falls back to passage-only.
     */
    assignmentBrief: string | null;
    /**
     * Language hint for the formatted passage. Defaults to `'es'` when
     * omitted.
     */
    language?: 'es' | 'en';
    /**
     * How many chunks to retrieve before grouping. Defaults to 200 —
     * enough to surface the top-10 books even when one dominant
     * resource (a long commentary) eats half the budget. Caller can
     * lower to keep latency down on small libraries.
     */
    topKChunks?: number;
    /**
     * Lower bound on chunk similarity. Chunks below this are dropped
     * before grouping. Defaults to 0.55 — empirically the threshold
     * below which Gemini embeddings on theological text start
     * surfacing tenuous matches that hurt the per-resource score.
     */
    minSimilarity?: number;
}

export interface RankedResource {
    /** `LibraryResource.id` of the ranked resource. */
    resourceId: string;
    /**
     * Number of distinct chunks from this resource that scored above
     * `minSimilarity`. Coverage proxy — a single lucky chunk shouldn't
     * outrank a resource that contributed five solid hits.
     */
    matchedChunkCount: number;
    /** Highest single-chunk similarity from this resource. */
    maxScore: number;
    /**
     * Composite score used for sort: `matchedChunkCount × maxScore`.
     * Penalizes lucky-singletons in favor of broad-and-strong matches.
     * The UI renders this as "✨ N chunks relevantes" alongside the
     * resource title in the smart-match dialog.
     */
    score: number;
}

export interface RankResourcesResult {
    /**
     * Resources ranked descending by `score`. Resources with zero
     * matched chunks are NOT in this array — the dialog falls back
     * to the existing "all resources" list when ranked is empty.
     */
    ranked: ReadonlyArray<RankedResource>;
    /**
     * The query string actually sent to the embedding model. Useful
     * for telemetry / debugging "why did the dialog show those resources?".
     */
    queryUsed: string;
}
