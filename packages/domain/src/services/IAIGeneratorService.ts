import { AIAgent } from '../entities/AIAgent';
import { AIChatMessage, InlineAttachment } from '../entities/AIChatSession';
import type { SupportedLanguage } from '../types/i18n';

/**
 * Response modes control both length and style/audience of the generated reply.
 *
 * Auto:
 *   - auto:      system infers the best mode from the user's message via the router LLM
 *
 * Length-oriented:
 *   - concise:   2–4 lines, no structure, minimal citation
 *   - detailed:  default thorough response with structure and callouts
 *
 * Style-oriented:
 *   - academic:  max rigor, tecnicismos, paradigms, Hebrew/Greek, dense bibliography
 *   - pastoral:  sermon prep / practical application, scripture-forward, minimal jargon
 *   - layperson: accessible language, analogies, no Greek/Hebrew unless indispensable
 */
export type ResponseMode = 'auto' | 'concise' | 'detailed' | 'academic' | 'pastoral' | 'layperson';

/** The concrete mode actually applied to the prompt — never 'auto'. */
export type ConcreteResponseMode = Exclude<ResponseMode, 'auto'>;

export interface SourceReference {
    title: string;
    author?: string;
    uri?: string;
    snippet?: string;
    page?: number;
    /**
     * Whether this source may be cited publicly (non-admin users).
     * Propagated from LibraryResource.publiclyCitable through the retrieval pipeline.
     * Defaults to false (safe) when absent.
     */
    publiclyCitable?: boolean;
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
        lengthPreference?: ResponseMode,
        onSources?: (sources: SourceReference[]) => void,
        /**
         * Phase 2 RAG: formatted context block retrieved via semantic search.
         * When provided, it's prepended to the message and the Gemini fileSearch
         * tool is skipped. Sources come from the caller (not grounding metadata).
         */
        retrievedContext?: string,
        /**
         * Locale of the response. Drives both the resolution of the agent's
         * localized `systemInstruction` and a defense-in-depth directive that
         * forces the model to reply in this language regardless of the
         * authoring language of the system prompt.
         */
        language?: SupportedLanguage,
        /**
         * Multimodal: optional inline files (images, PDFs) sent alongside
         * the text. Each is base64-encoded and passed to the model as an
         * `inlineData` Part. The bytes are not persisted — they belong to
         * this single exchange only.
         */
        attachments?: InlineAttachment[],
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
        lengthPreference?: ResponseMode,
        enableThinking?: boolean,
        language?: SupportedLanguage,
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
        lengthPreference?: ResponseMode,
        language?: SupportedLanguage,
    ): Promise<{ response: string; sources: SourceReference[] }>;
}
