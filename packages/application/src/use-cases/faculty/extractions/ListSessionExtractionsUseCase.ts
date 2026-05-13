import { Extraction, IExtractionRepository } from '@dosfilos/domain';

export class ListSessionExtractionsUseCase {
    constructor(private readonly repo: IExtractionRepository) {}

    execute(userId: string, sessionId: string): Promise<Extraction[]> {
        return this.repo.listBySession(userId, sessionId);
    }
}
