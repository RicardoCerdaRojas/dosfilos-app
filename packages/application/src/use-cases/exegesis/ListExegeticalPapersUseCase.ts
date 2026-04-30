import type {
    ExegeticalPaper,
    IExegeticalPaperRepository,
} from '@dosfilos/domain';

/**
 * Lists the user's non-archived papers, ordered by most recent activity.
 *
 * Archived/trashed papers are NOT returned by `execute` — those go through
 * `executeIncludingArchived` (which the future "Trash" tab will call).
 * Splitting the methods keeps the default path obviously safe.
 */
export class ListExegeticalPapersUseCase {
    constructor(private paperRepository: IExegeticalPaperRepository) { }

    async execute(ownerId: string): Promise<ExegeticalPaper[]> {
        if (!ownerId) {
            throw new Error('ListExegeticalPapersUseCase: ownerId required');
        }
        return this.paperRepository.listPapers(ownerId);
    }

    async executeIncludingArchived(ownerId: string): Promise<ExegeticalPaper[]> {
        if (!ownerId) {
            throw new Error('ListExegeticalPapersUseCase: ownerId required');
        }
        return this.paperRepository.listAllPapers(ownerId);
    }
}
