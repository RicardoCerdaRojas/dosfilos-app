import { Extraction, IExtractionRepository } from '@dosfilos/domain';

export class GetExtractionUseCase {
    constructor(private readonly repo: IExtractionRepository) {}

    execute(userId: string, extractionId: string): Promise<Extraction | null> {
        return this.repo.getById(userId, extractionId);
    }
}
