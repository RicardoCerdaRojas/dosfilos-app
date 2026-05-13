import { IExtractionRepository } from '@dosfilos/domain';

export class DeleteExtractionUseCase {
    constructor(private readonly repo: IExtractionRepository) {}

    execute(userId: string, extractionId: string): Promise<void> {
        return this.repo.delete(userId, extractionId);
    }
}
