import type {
    ExegesisPaperSummary,
    IExegeticalPaperRepository,
} from '@dosfilos/domain';

/**
 * Lists the user's papers as lightweight summaries for the dashboard list —
 * headline fields + counts, without the heavy `steps`/`assembledMarkdown`/
 * `sources`. Includes archived papers; the list view filters them client-side
 * (so its "incluir archivados" toggle works). The full paper is loaded via
 * `GetExegeticalPaperUseCase` only when one is opened.
 */
export class ListExegesisPaperSummariesUseCase {
    constructor(private paperRepository: IExegeticalPaperRepository) {}

    async execute(ownerId: string): Promise<ExegesisPaperSummary[]> {
        if (!ownerId) {
            throw new Error('ListExegesisPaperSummariesUseCase: ownerId required');
        }
        return this.paperRepository.listPaperSummaries(ownerId);
    }
}
