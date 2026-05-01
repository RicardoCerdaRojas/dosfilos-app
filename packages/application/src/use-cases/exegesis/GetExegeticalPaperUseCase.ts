import type {
    ExegeticalPaper,
    IExegeticalPaperRepository,
} from '@dosfilos/domain';

/**
 * Fetches a single paper, enforcing ownership at the repository level.
 * Returns null when the paper doesn't exist OR when the requesting user
 * doesn't own it — the two are intentionally indistinguishable from the
 * caller's perspective so we don't leak existence to non-owners.
 */
export class GetExegeticalPaperUseCase {
    constructor(private paperRepository: IExegeticalPaperRepository) { }

    async execute(ownerId: string, paperId: string): Promise<ExegeticalPaper | null> {
        if (!ownerId || !paperId) {
            throw new Error('GetExegeticalPaperUseCase: ownerId and paperId required');
        }
        return this.paperRepository.getPaper(ownerId, paperId);
    }
}
