import type {
    ExegeticalPaper,
    IExegeticalPaperRepository,
    PaperRubric,
    UpdateRubricInput,
} from '@dosfilos/domain';

/**
 * Patches the paper's rubric.
 *
 * Caller passes only the fields they're changing; the use case merges
 * with the persisted rubric. Provenance flips to `'user-edited'`
 * unless every patched field matches what was already there (a no-op
 * save shouldn't claim authorship).
 *
 * Validation:
 *   - At least one source requirement is required when the caller
 *     passes a non-empty array. An empty array is allowed (the
 *     student opted out of all minimums) but provenance still moves
 *     to user-edited.
 *   - Numeric fields (minimum / maximum) are clamped to non-negative;
 *     `maximum < minimum` is corrected by raising maximum to match.
 *
 * Returns the updated paper so React Query callers can refresh the
 * cache directly.
 */
export class UpdateRubricUseCase {
    constructor(private paperRepository: IExegeticalPaperRepository) { }

    async execute(input: UpdateRubricInput): Promise<ExegeticalPaper> {
        if (!input.ownerId) throw new Error('UpdateRubricUseCase: ownerId required');
        if (!input.paperId) throw new Error('UpdateRubricUseCase: paperId required');

        const paper = await this.paperRepository.getPaper(input.ownerId, input.paperId);
        if (!paper) throw new Error(`Paper ${input.paperId} not found`);

        const existing = paper.rubric;
        if (!existing) {
            throw new Error(`Paper ${input.paperId} has no rubric to patch`);
        }

        const sourceRequirements = input.sourceRequirements
            ? input.sourceRequirements.map(r => ({
                ...r,
                minimum: Math.max(0, Math.floor(r.minimum)),
                maximum: r.maximum === null ? null : Math.max(Math.max(0, Math.floor(r.maximum)), Math.max(0, Math.floor(r.minimum))),
            }))
            : existing.sourceRequirements;

        const next: PaperRubric = {
            ...existing,
            title: input.title !== undefined ? input.title : existing.title,
            description: input.description !== undefined ? input.description : existing.description,
            citationStandard: input.citationStandard !== undefined ? input.citationStandard : existing.citationStandard,
            expectedLength: input.expectedLength !== undefined ? input.expectedLength : existing.expectedLength,
            sourceRequirements,
            structuralExpectations: input.structuralExpectations ?? existing.structuralExpectations,
            // Authorship: any patch flips provenance to user-edited
            // unless we were already there. Re-extracting from a doc
            // would explicitly set provenance back via
            // RefreshRubricFromExtraction (a future use case).
            provenance: 'user-edited',
            updatedAt: new Date(),
        };

        return this.paperRepository.setRubric(input.ownerId, input.paperId, next);
    }
}
