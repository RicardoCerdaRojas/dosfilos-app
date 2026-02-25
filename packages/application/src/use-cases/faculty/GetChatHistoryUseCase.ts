import { IAIChatRepository, AIChatSession } from '@dosfilos/domain';

export class GetChatHistoryUseCase {
    constructor(private chatRepository: IAIChatRepository) { }

    async execute(userId: string): Promise<AIChatSession[]> {
        return this.chatRepository.getUserSessions(userId);
    }
}
