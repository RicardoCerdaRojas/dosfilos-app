import {
    buildStrategyOnlyRubric,
    type ExegeticalPaper,
    type IExegeticalPaperRepository,
} from '@dosfilos/domain';

/**
 * Replaces a paper's embedded `paper.rubric` with the strategy-only
 * preset (`buildStrategyOnlyRubric`).
 *
 * Mirrors `ApplyRubricTemplateToPaperUseCase` for symmetry — papers
 * created from places that bypass the create wizard (e.g. the
 * Sermon Series planner deep-links straight into a paper) need a way
 * to switch to the strategy-only preset after the fact, not just at
 * create time. Without this use case the only post-create path was
 * `applyTemplate` (user templates) or `resetRubric` (system default)
 * — neither could express "strategy only".
 *
 * Caller-side confirmation is expected when the paper already had
 * a meaningful rubric the student tweaked manually.
 */
export class ApplyStrategyOnlyRubricToPaperUseCase {
    constructor(private paperRepository: IExegeticalPaperRepository) { }

    async execute(input: { ownerId: string; paperId: string }): Promise<ExegeticalPaper> {
        if (!input.ownerId) throw new Error('ApplyStrategyOnlyRubricToPaperUseCase: ownerId required');
        if (!input.paperId) throw new Error('ApplyStrategyOnlyRubricToPaperUseCase: paperId required');

        return this.paperRepository.setRubric(
            input.ownerId,
            input.paperId,
            buildStrategyOnlyRubric(),
        );
    }
}
