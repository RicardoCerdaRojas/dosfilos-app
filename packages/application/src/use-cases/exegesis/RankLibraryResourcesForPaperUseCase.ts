import type {
    ExegeticalPaper,
    IExegeticalPaperRepository,
    IResourceRanker,
    RankResourcesResult,
    RankedResource,
} from '@dosfilos/domain';

export interface RankLibraryResourcesForPaperInput {
    ownerId: string;
    paperId: string;
    /**
     * Optional cap on chunks retrieved from Firestore before grouping.
     * Defaults handled by the ranker port (today: 200). Caller can
     * lower for very large libraries to keep latency in budget.
     */
    topKChunks?: number;
}

export interface RankLibraryResourcesForPaperOutput {
    /** The paper used as the ranking input. Returned for caller convenience. */
    paper: ExegeticalPaper;
    /**
     * Resources ranked descending by composite score (count × maxScore).
     * Empty when nothing scored above the relevance floor — the dialog
     * falls back to its existing "all resources" list in that case.
     */
    ranked: ReadonlyArray<RankedResource>;
    /** Embedding query that produced the ranking (debug / telemetry). */
    queryUsed: string;
}

/**
 * v1.7 paper-corpus smart-match — Sprint 2 / Fase B.
 *
 * Given a paper, asks the `IResourceRanker` port for the user's
 * library resources ranked by semantic relevance to the paper's
 * passage + brief. The dialog uses this to pre-select the top-N
 * matches and hide the long tail behind a "show all" toggle.
 *
 * The use case itself is thin — most of the work happens in the
 * ranker (one embedding + one vector search + grouping). Keeping
 * it as a use case anyway because:
 *   1. The web app shouldn't talk to ports directly (architecture).
 *   2. Future enhancements (e.g. intersect with Fase A
 *      `coversBibleBooks` filter, exclude already-extracted resources,
 *      respect a "feature flag off" path) all naturally accrete here.
 *
 * Errors:
 *   - `Error('Paper not found')` when the paper id doesn't exist /
 *     isn't owned by the caller.
 *   - Errors from the ranker propagate as-is — the use case does
 *     NOT swallow them. The dialog catches and falls back to the
 *     unranked list.
 */
export class RankLibraryResourcesForPaperUseCase {
    constructor(
        private paperRepository: IExegeticalPaperRepository,
        private resourceRanker: IResourceRanker,
    ) { }

    async execute(input: RankLibraryResourcesForPaperInput): Promise<RankLibraryResourcesForPaperOutput> {
        if (!input.ownerId || !input.paperId) {
            throw new Error('RankLibraryResourcesForPaperUseCase: ownerId and paperId required');
        }

        const paper = await this.paperRepository.getPaper(input.ownerId, input.paperId);
        if (!paper) throw new Error(`Paper ${input.paperId} not found`);

        const result: RankResourcesResult = await this.resourceRanker.rank({
            userId: input.ownerId,
            passage: paper.passage,
            assignmentBrief: paper.assignmentBrief,
            language: paper.displayLanguage,
            ...(input.topKChunks !== undefined && { topKChunks: input.topKChunks }),
        });

        return {
            paper,
            ranked: result.ranked,
            queryUsed: result.queryUsed,
        };
    }
}
