import { IAIChatRepository } from '@dosfilos/domain';

export class RenameChatSessionUseCase {
    constructor(private readonly chatRepository: IAIChatRepository) { }

    async execute(userId: string, sessionId: string, title: string): Promise<void> {
        if (!title.trim()) {
            throw new Error('Title cannot be empty');
        }
        return this.chatRepository.renameSession(userId, sessionId, title.trim());
    }
}
