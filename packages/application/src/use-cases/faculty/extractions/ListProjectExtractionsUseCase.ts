import { Extraction, IExtractionRepository } from '@dosfilos/domain';

export class ListProjectExtractionsUseCase {
    constructor(private readonly repo: IExtractionRepository) {}

    execute(userId: string, projectId: string): Promise<Extraction[]> {
        return this.repo.listByProject(userId, projectId);
    }
}
