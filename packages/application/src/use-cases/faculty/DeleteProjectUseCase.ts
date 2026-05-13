import { IAIProjectRepository, IAIChatRepository, IExtractionRepository } from '@dosfilos/domain';

/**
 * Deletes a project using the ORPHAN strategy:
 *   - Chat sessions are NOT deleted — their projectId is set to null so
 *     they move back to the "Sin proyecto" section of the sidebar.
 *   - Persisted extractions pinned to this project are NOT deleted —
 *     their projectId is set to null so they appear in the user's
 *     library but without project context. They retain their sessionId.
 */
export class DeleteProjectUseCase {
    constructor(
        private readonly projectRepository: IAIProjectRepository,
        private readonly chatRepository: IAIChatRepository,
        private readonly extractionRepository: IExtractionRepository,
    ) { }

    async execute(userId: string, projectId: string): Promise<void> {
        await this.chatRepository.clearProjectFromSessions(userId, projectId);
        await this.extractionRepository.orphanByProject(userId, projectId);
        await this.projectRepository.deleteProject(projectId);
    }
}
