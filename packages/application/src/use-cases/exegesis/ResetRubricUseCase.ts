import {
    buildDefaultRubric,
    type ExegeticalPaper,
    type IExegeticalPaperRepository,
    type ResetRubricInput,
} from '@dosfilos/domain';

/**
 * Restores the system-default TMS exegetical rubric, discarding any
 * student edits or extracted-from-document rubric content.
 *
 * The setup UI gates this behind a confirmation dialog because the
 * action is destructive. Returning the paper lets React Query
 * refresh the cache without a follow-up read.
 */
export class ResetRubricUseCase {
    constructor(private paperRepository: IExegeticalPaperRepository) { }

    async execute(input: ResetRubricInput): Promise<ExegeticalPaper> {
        if (!input.ownerId) throw new Error('ResetRubricUseCase: ownerId required');
        if (!input.paperId) throw new Error('ResetRubricUseCase: paperId required');

        const fresh = buildDefaultRubric();
        return this.paperRepository.setRubric(input.ownerId, input.paperId, fresh);
    }
}
