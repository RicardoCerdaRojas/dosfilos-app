import { IExtractionRepository } from '@dosfilos/domain';

export class RenameExtractionUseCase {
    constructor(private readonly repo: IExtractionRepository) {}

    execute(userId: string, extractionId: string, title: string): Promise<void> {
        const trimmed = title.trim();
        if (!trimmed) throw new Error('Title cannot be empty');
        return this.repo.rename(userId, extractionId, trimmed);
    }
}
