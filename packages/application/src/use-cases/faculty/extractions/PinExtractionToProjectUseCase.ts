import { IExtractionRepository } from '@dosfilos/domain';

/**
 * Sets the projectId on an extraction so it appears in that project's
 * library view. Pass null to unpin. Idempotent.
 */
export class PinExtractionToProjectUseCase {
    constructor(private readonly repo: IExtractionRepository) {}

    execute(userId: string, extractionId: string, projectId: string | null): Promise<void> {
        return this.repo.pinToProject(userId, extractionId, projectId);
    }
}
