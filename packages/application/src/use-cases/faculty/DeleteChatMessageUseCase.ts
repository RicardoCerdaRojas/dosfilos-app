import { IAIChatRepository } from '@dosfilos/domain';

export class DeleteChatMessageUseCase {
    constructor(private chatRepository: IAIChatRepository) { }

    async execute(userId: string, sessionId: string, messageId: string): Promise<void> {
        return this.chatRepository.deleteMessage(userId, sessionId, messageId);
    }
}
