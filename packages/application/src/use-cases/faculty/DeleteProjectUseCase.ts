import { IAIProjectRepository, IAIChatRepository } from '@dosfilos/domain';

/**
 * Deletes a project using the ORPHAN strategy:
 * sessions are NOT deleted — their projectId is set to null so they
 * move back to the "Sin proyecto" section of the sidebar.
 */
export class DeleteProjectUseCase {
    constructor(
        private readonly projectRepository: IAIProjectRepository,
        private readonly chatRepository: IAIChatRepository,
    ) { }

    async execute(userId: string, projectId: string): Promise<void> {
        // 1. Orphan all sessions that belong to this project
        await this.chatRepository.clearProjectFromSessions(userId, projectId);
        // 2. Delete the project document
        await this.projectRepository.deleteProject(projectId);
    }
}
