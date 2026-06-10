import { Extraction, IExtractionRepository } from '@dosfilos/domain';

/**
 * Trimmed variant of {@link ListUserExtractionsUseCase} for the cross-session
 * library list: returns the user's artifacts newest-first with `markdown`
 * dropped (the dominant payload the list never renders). The full body loads
 * per-artifact via `getById` when one is opened in the editor.
 */
export class ListUserExtractionSummariesUseCase {
    constructor(private readonly repo: IExtractionRepository) {}

    execute(userId: string): Promise<Extraction[]> {
        return this.repo.listSummariesByUser(userId);
    }
}
