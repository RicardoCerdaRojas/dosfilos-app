import { Extraction, IExtractionRepository } from '@dosfilos/domain';

export class ListUserExtractionsUseCase {
    constructor(private readonly repo: IExtractionRepository) {}

    execute(userId: string): Promise<Extraction[]> {
        return this.repo.listByUser(userId);
    }
}
