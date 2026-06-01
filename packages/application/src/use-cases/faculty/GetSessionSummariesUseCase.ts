import { IAIChatRepository, AIChatSession } from '@dosfilos/domain';

/**
 * Trimmed session list for the sidebar/dashboard — returns sessions without
 * their `messages` (heavy), each with a `messageCount`. The full transcript is
 * loaded via `GetSessionUseCase` only when a session is opened.
 */
export class GetSessionSummariesUseCase {
    constructor(private chatRepository: IAIChatRepository) {}

    async execute(userId: string): Promise<AIChatSession[]> {
        return this.chatRepository.getUserSessionSummaries(userId);
    }
}
