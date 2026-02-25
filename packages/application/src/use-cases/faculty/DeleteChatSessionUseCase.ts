import { IAIChatRepository } from '@dosfilos/domain';

export class DeleteChatSessionUseCase {
    constructor(private readonly chatRepository: IAIChatRepository) { }

    async execute(userId: string, sessionId: string): Promise<void> {
        await this.chatRepository.deleteSession(userId, sessionId);
    }
}
