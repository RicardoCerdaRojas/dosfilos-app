import {
    IAIChatRepository,
    IAIAgentRepository,
    IAIGeneratorService,
    AIChatMessage
} from '@dosfilos/domain';
import { generateId } from '../../utils/generateId';

export class SendAgentMessageUseCase {
    constructor(
        private agentRepository: IAIAgentRepository,
        private chatRepository: IAIChatRepository,
        private generatorService: IAIGeneratorService
    ) { }

    async execute(
        userId: string,
        sessionId: string,
        messageContent: string,
        onChunk?: (text: string) => void,
        lengthPreference?: 'concise' | 'detailed'
    ): Promise<string> {
        const session = await this.chatRepository.getSession(userId, sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        const agent = await this.agentRepository.getAgent(session.agentId);
        if (!agent) {
            throw new Error('Agent not found');
        }

        // 1. Create and save the User message

        const userMessage: AIChatMessage = {
            id: generateId(),
            role: 'user',
            content: messageContent,
            timestamp: new Date()
        };
        await this.chatRepository.addMessageToSession(userId, sessionId, userMessage);

        // 2. Prepare the full history for the LLM
        const history = [...session.messages, userMessage];

        // 3. Request generation (streaming or bulk)
        let responseContent = '';
        if (onChunk) {
            responseContent = await this.generatorService.sendMessageStream(
                agent,
                history,
                messageContent,
                onChunk,
                lengthPreference
            );
        } else {
            responseContent = await this.generatorService.sendMessage(
                agent,
                history,
                messageContent,
                lengthPreference
            );
        }

        // 4. Save the Model response
        const modelMessage: AIChatMessage = {
            id: generateId(),
            role: 'model',
            content: responseContent,
            timestamp: new Date()
        };
        await this.chatRepository.addMessageToSession(userId, sessionId, modelMessage);

        return responseContent;
    }
}
