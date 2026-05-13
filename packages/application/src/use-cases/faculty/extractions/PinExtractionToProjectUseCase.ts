import { IExtractionRepository } from '@dosfilos/domain';

/**
 * Adds an extraction to a project's library. Idempotent — pinning to
 * a project the artifact already belongs to is a no-op. An artifact
 * can be pinned to multiple projects (cross-project reuse).
 */
export class AddExtractionToProjectUseCase {
    constructor(private readonly repo: IExtractionRepository) {}

    execute(userId: string, extractionId: string, projectId: string): Promise<void> {
        if (!projectId.trim()) throw new Error('projectId required');
        return this.repo.addToProject(userId, extractionId, projectId);
    }
}

/**
 * Removes an extraction from a project's library. Idempotent.
 */
export class RemoveExtractionFromProjectUseCase {
    constructor(private readonly repo: IExtractionRepository) {}

    execute(userId: string, extractionId: string, projectId: string): Promise<void> {
        if (!projectId.trim()) throw new Error('projectId required');
        return this.repo.removeFromProject(userId, extractionId, projectId);
    }
}
