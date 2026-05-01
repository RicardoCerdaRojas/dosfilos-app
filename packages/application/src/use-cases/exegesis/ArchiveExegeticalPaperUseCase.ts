import type {
    ExegeticalPaper,
    IExegeticalPaperRepository,
} from '@dosfilos/domain';

/**
 * Soft-delete: moves a paper to the archived state. Reversible via
 * `unarchive`. The paper stays in Firestore — full deletion goes through
 * the future `HardDeleteExegeticalPaperUseCase` which the "Trash > Empty"
 * action would call (not yet implemented in v1).
 *
 * Why a single use case for both directions: archive and unarchive are
 * symmetric transitions on the same boolean-ish state. Splitting them adds
 * indirection without clarity.
 */
export class ArchiveExegeticalPaperUseCase {
    constructor(private paperRepository: IExegeticalPaperRepository) { }

    async archive(ownerId: string, paperId: string): Promise<ExegeticalPaper> {
        if (!ownerId || !paperId) {
            throw new Error('ArchiveExegeticalPaperUseCase: ownerId and paperId required');
        }
        return this.paperRepository.archivePaper(ownerId, paperId);
    }

    async unarchive(ownerId: string, paperId: string): Promise<ExegeticalPaper> {
        if (!ownerId || !paperId) {
            throw new Error('ArchiveExegeticalPaperUseCase: ownerId and paperId required');
        }
        return this.paperRepository.unarchivePaper(ownerId, paperId);
    }
}
