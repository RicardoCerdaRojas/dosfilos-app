import type {
    ExegeticalStep,
    IExegeticalPaperRepository,
} from '@dosfilos/domain';

/**
 * Triggers initial step creation for a paper that's been configured.
 *
 * Transitions the paper from 'configuring' to 'in-progress' and seeds
 * one step per verse + conclusion + introduction + assembly. Idempotent
 * at the repository level — re-calling on a paper that already has
 * steps returns the existing ones unchanged.
 *
 * v1 limitation (enforced by the repo): the passage must be a single
 * chapter with explicit verses (e.g. "Heb 1:1-4"). Multi-chapter and
 * chapter-only references throw a clear error which the UI surfaces
 * as a hint to edit the passage. Lifting this limitation requires
 * verse-counting per chapter (currently not in the canon data).
 */
export class SeedStepsForPassageUseCase {
    constructor(private paperRepository: IExegeticalPaperRepository) { }

    async execute(ownerId: string, paperId: string): Promise<ExegeticalStep[]> {
        if (!ownerId || !paperId) {
            throw new Error('SeedStepsForPassageUseCase: ownerId and paperId required');
        }
        return this.paperRepository.seedStepsForPassage(ownerId, paperId);
    }
}
