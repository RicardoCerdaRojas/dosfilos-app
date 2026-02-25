import { IAIAgentRepository, IAIChatRepository, AIChatSession } from '@dosfilos/domain';

export class CreateChatSessionUseCase {
    constructor(
        private agentRepository: IAIAgentRepository,
        private chatRepository: IAIChatRepository
    ) { }

    async execute(userId: string, agentId: string, initialMessage?: string): Promise<AIChatSession> {
        const agent = await this.agentRepository.getAgent(agentId);
        if (!agent) {
            throw new Error(`Agent ${agentId} not found`);
        }

        let sessionTitle = `Sesión con ${agent.name}`;
        if (initialMessage) {
            sessionTitle = initialMessage.length > 50
                ? initialMessage.substring(0, 47) + '...'
                : initialMessage;
        }

        const session = await this.chatRepository.createSession({
            userId,
            agentId,
            title: sessionTitle,
            messages: []
        });

        return session;
    }
}
