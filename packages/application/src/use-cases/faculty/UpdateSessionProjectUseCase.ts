import { IAIChatRepository } from '@dosfilos/domain';

export class UpdateSessionProjectUseCase {
    constructor(private readonly chatRepository: IAIChatRepository) { }

    async execute(userId: string, sessionId: string, projectId: string | null): Promise<void> {
        return this.chatRepository.updateSessionProject(userId, sessionId, projectId);
    }
}
