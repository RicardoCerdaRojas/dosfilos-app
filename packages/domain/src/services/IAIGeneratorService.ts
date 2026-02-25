import { AIAgent } from '../entities/AIAgent';
import { AIChatMessage } from '../entities/AIChatSession';

export interface IAIGeneratorService {
    /**
     * Sends a message to the AI agent and streams the response back via the onChunk callback.
     * The history parameter provides the context of the conversation.
     * The agent parameter provides the specific system instructions and role.
     */
    sendMessageStream(
        agent: AIAgent,
        history: AIChatMessage[],
        message: string,
        onChunk: (text: string) => void,
        lengthPreference?: 'concise' | 'detailed'
    ): Promise<string>;

    /**
     * Sends a message to the AI agent and waits for the full response.
     * Useful for extraction tasks or non-interactive generation.
     */
    sendMessage(
        agent: AIAgent,
        history: AIChatMessage[],
        message: string,
        lengthPreference?: 'concise' | 'detailed'
    ): Promise<string>;
}
