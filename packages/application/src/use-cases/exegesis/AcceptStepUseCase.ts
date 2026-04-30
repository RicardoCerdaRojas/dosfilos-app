import type {
    AcceptStepInput,
    ExegeticalStep,
    IExegeticalPaperRepository,
} from '@dosfilos/domain';

/**
 * Marks a generated version as the accepted content for a step,
 * transitioning the step to 'accepted' state. The accepted version is
 * what the assembly step will concatenate into the final paper.
 *
 * `versionId` is required (not implicit "current") so the user can race-
 * tolerantly accept a specific version even if a regeneration happened
 * between the click and the request — the explicit id avoids accepting
 * the wrong content.
 */
export class AcceptStepUseCase {
    constructor(private paperRepository: IExegeticalPaperRepository) { }

    async execute(input: AcceptStepInput): Promise<ExegeticalStep> {
        if (!input.ownerId || !input.paperId || !input.stepId || !input.versionId) {
            throw new Error('AcceptStepUseCase: ownerId, paperId, stepId and versionId required');
        }
        return this.paperRepository.acceptStepVersion(
            input.ownerId,
            input.paperId,
            input.stepId,
            input.versionId
        );
    }
}
