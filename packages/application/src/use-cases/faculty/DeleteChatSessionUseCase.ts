import { IAIChatRepository, IExtractionRepository } from '@dosfilos/domain';

/**
 * Deletes a chat session. Persisted extractions derived from this
 * session SURVIVE — their `sessionId` is nulled (orphan pattern) and
 * `sourceSessionDeleted` is flagged so the UI can show a degraded
 * provenance hint. Artifacts are valuable outputs in their own right.
 */
export class DeleteChatSessionUseCase {
    constructor(
        private readonly chatRepository: IAIChatRepository,
        private readonly extractionRepository: IExtractionRepository,
    ) { }

    async execute(userId: string, sessionId: string): Promise<void> {
        await this.extractionRepository.orphanBySession(userId, sessionId);
        await this.chatRepository.deleteSession(userId, sessionId);
    }
}
