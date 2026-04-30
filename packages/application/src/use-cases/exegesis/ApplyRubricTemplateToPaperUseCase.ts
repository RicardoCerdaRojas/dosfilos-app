import type {
    ExegeticalPaper,
    IExegeticalPaperRepository,
    IUserRubricRepository,
    PaperRubric,
} from '@dosfilos/domain';

/**
 * Copies a `UserRubric` template into a paper's embedded
 * `paper.rubric` field, replacing whatever was there. The paper
 * keeps its own snapshot from this point on — future edits to the
 * template do NOT propagate.
 *
 * The copy preserves the template's content but resets timestamps
 * to "now" and stamps `provenance: 'user-edited'` since the act
 * of applying a template to a specific paper is itself a
 * curatorial choice (the student picked THIS template for THIS
 * paper).
 *
 * Caller-side confirmation is expected when the paper already had
 * a meaningful rubric the student tweaked manually.
 */
export class ApplyRubricTemplateToPaperUseCase {
    constructor(
        private paperRepository: IExegeticalPaperRepository,
        private rubricRepository: IUserRubricRepository,
    ) { }

    async execute(input: {
        ownerId: string;
        paperId: string;
        rubricTemplateId: string;
    }): Promise<ExegeticalPaper> {
        if (!input.ownerId) throw new Error('ApplyRubricTemplateToPaperUseCase: ownerId required');
        if (!input.paperId) throw new Error('ApplyRubricTemplateToPaperUseCase: paperId required');
        if (!input.rubricTemplateId) throw new Error('ApplyRubricTemplateToPaperUseCase: rubricTemplateId required');

        const template = await this.rubricRepository.getRubric(input.ownerId, input.rubricTemplateId);
        if (!template) throw new Error(`Rubric template ${input.rubricTemplateId} not found`);

        const now = new Date();
        const snapshot: PaperRubric = {
            ...template.rubric,
            createdAt: now,
            updatedAt: now,
        };

        return this.paperRepository.setRubric(input.ownerId, input.paperId, snapshot);
    }
}
