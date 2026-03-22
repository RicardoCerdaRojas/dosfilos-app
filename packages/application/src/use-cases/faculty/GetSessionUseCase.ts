import { IAIChatRepository, AIChatSession } from '@dosfilos/domain';

export class GetSessionUseCase {
    constructor(private chatRepository: IAIChatRepository) { }

    async execute(userId: string, sessionId: string): Promise<AIChatSession | null> {
        return this.chatRepository.getSession(userId, sessionId);
    }
}
