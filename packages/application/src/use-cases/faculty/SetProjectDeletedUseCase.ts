import { AIProject, IAIProjectRepository } from '@dosfilos/domain';

/**
 * Soft-delete: moves project to the user's "Papelera" tab. The doc isn't
 * removed; sessions/sermons keep their `projectId`. Reversible via Restore.
 *
 * Permanent removal goes through `DeleteProjectUseCase` (orphans sessions,
 * deletes the doc) — typically invoked from the Papelera tab as
 * "Eliminar permanentemente".
 */
export class SetProjectDeletedUseCase {
    constructor(private readonly projectRepository: IAIProjectRepository) {}

    async execute(projectId: string, deleted: boolean): Promise<AIProject> {
        return this.projectRepository.setProjectDeleted(projectId, deleted);
    }
}
