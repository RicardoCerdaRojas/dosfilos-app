import { AIAgent } from '../entities/AIAgent';
import { AIChatMessage } from '../entities/AIChatSession';

export interface SourceReference {
    title: string;
    author?: string;
    uri?: string;
    snippet?: string;
    page?: number;
}

export interface IAIGeneratorService {
    /**
     * Sends a message to the AI agent and streams the response back via the onChunk callback.
     * The history parameter provides the context of the conversation.
     * The agent parameter provides the specific system instructions and role.
     * The onSources callback is called after the stream completes with any grounding sources found.
     */
    sendMessageStream(
        agent: AIAgent,
        history: AIChatMessage[],
        message: string,
        onChunk: (text: string) => void,
        lengthPreference?: 'concise' | 'detailed',
        onSources?: (sources: SourceReference[]) => void,
        /**
         * Phase 2 RAG: formatted context block retrieved via semantic search.
         * When provided, it's prepended to the message and the Gemini fileSearch
         * tool is skipped. Sources come from the caller (not grounding metadata).
         */
        retrievedContext?: string
    ): Promise<string>;

    /**
     * Sends a message to the AI agent and waits for the full response.
     * Useful for extraction tasks or non-interactive generation.
     *
     * @param enableThinking - When true, allows the model to use its internal
     *   reasoning budget for deeper analysis. Useful for extraction tasks
     *   where quality matters more than latency.
     */
    sendMessage(
        agent: AIAgent,
        history: AIChatMessage[],
        message: string,
        lengthPreference?: 'concise' | 'detailed',
        enableThinking?: boolean
    ): Promise<string>;

    /**
     * Like sendMessage but also returns grounding sources from File Search.
     * Used in fan-out mode where each specialist response must contribute sources
     * to the final bibliography panel.
     */
    sendMessageWithSources(
        agent: AIAgent,
        history: AIChatMessage[],
        message: string,
        lengthPreference?: 'concise' | 'detailed'
    ): Promise<{ response: string; sources: SourceReference[] }>;
}
