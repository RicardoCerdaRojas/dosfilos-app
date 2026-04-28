import { AIProject, IAIProjectRepository } from '@dosfilos/domain';

/**
 * Toggles a project's archive state. Archived projects stay accessible
 * (URL, "Archivados" filter) but disappear from the active projects list
 * and from dashboard home.
 *
 * Sessions, sermons, language sessions linked to the project keep their
 * `projectId` — archive is purely an organizational signal, not deletion.
 */
export class SetProjectArchivedUseCase {
    constructor(private readonly projectRepository: IAIProjectRepository) {}

    async execute(projectId: string, archived: boolean): Promise<AIProject> {
        return this.projectRepository.setProjectArchived(projectId, archived);
    }
}
