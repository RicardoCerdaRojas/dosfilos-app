import { GoogleGenerativeAI } from '@google/generative-ai';
import {
    IAIGeneratorService,
    AIAgent,
    AIChatMessage,
    SourceReference,
    ResponseMode,
    DEFAULT_LANGUAGE,
    resolveLocalized,
} from '@dosfilos/domain';
import type { SupportedLanguage } from '@dosfilos/domain';
import {
    getGlobalBehaviorPrompt,
    getModeInstruction,
    getLanguageDirective,
} from './prompts/geminiMultiAgentPrompts';

export class GeminiMultiAgentService implements IAIGeneratorService {
    private genAI: GoogleGenerativeAI;
    private modelName: string;

    // System prompts (es/en) live in ./prompts/geminiMultiAgentPrompts.ts so
    // each language variant can be edited side-by-side without touching service
    // logic. See `getGlobalBehaviorPrompt()` and `getModeInstruction()`.

    constructor(apiKey: string, modelName?: string) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.modelName = modelName || 'gemini-2.5-flash';
    }

    private formatHistoryForGemini(history: AIChatMessage[]) {
        return history.map(msg => ({
            role: msg.role === 'model' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));
    }

    /**
     * Builds the full system instruction for a request:
     *   1. Localized global behavior prompt (citation rules, callout taxonomy,
     *      Hebrew ortography, ideal-response example).
     *   2. Defense-in-depth language directive (forces output language even
     *      when the agent's personality prompt is authored only in Spanish).
     *   3. The agent's resolved `systemInstruction` (es/en variant).
     *   4. Optional response-mode instruction (concise / detailed / academic …).
     *
     * Steps 1, 2 and 4 are localized; step 3 falls back to Spanish via
     * `resolveLocalized` when the agent doesn't have an EN variant yet.
     */
    private buildSystemInstruction(
        agent: AIAgent,
        preference: ResponseMode | undefined,
        language: SupportedLanguage,
    ): string {
        const agentInstruction = resolveLocalized(agent.systemInstruction, language);
        const sections: string[] = [
            getGlobalBehaviorPrompt(language),
            getLanguageDirective(language),
            language === 'en'
                ? `SPECIALIST-SPECIFIC INSTRUCTIONS:\n${agentInstruction}`
                : `INSTRUCCIONES ESPECÍFICAS DEL ESPECIALISTA:\n${agentInstruction}`,
        ];

        const modeInstruction = getModeInstruction(preference, language);
        if (modeInstruction) sections.push(modeInstruction);

        return sections.join('\n\n');
    }

    async sendMessageStream(
        agent: AIAgent,
        history: AIChatMessage[],
        message: string,
        onChunk: (text: string) => void,
        lengthPreference?: ResponseMode,
        onSources?: (sources: SourceReference[]) => void,
        retrievedContext?: string,
        language: SupportedLanguage = DEFAULT_LANGUAGE,
    ): Promise<string> {
        const usingPhase2RAG = !!retrievedContext;
        const agentName = resolveLocalized(agent.name, language);

        const generationConfig = {
            // Hard ceiling on output. Gemini 2.5 Flash with no cap has been
            // observed degenerating into token-repetition loops mid-table
            // (a markdown separator row repeating thousands of times).
            maxOutputTokens: 8192,
            // Default (~1.0) was prone to the same loop. 0.6 keeps answers
            // varied without enabling runaway sampling, and topP narrows
            // the nucleus enough to cut off the repetition basin.
            temperature: 0.6,
            topP: 0.9,
            thinkingConfig: { thinkingBudget: 0 },
        };
        console.log('[GeminiMultiAgent.stream] generationConfig:', generationConfig);
        const options: any = {
            model: this.modelName,
            systemInstruction: this.buildSystemInstruction(agent, lengthPreference, language),
            generationConfig,
        };

        // Only use fileSearch tool in LEGACY path (Phase 1). When Phase 2 retrieval
        // is providing context explicitly, don't let Gemini do its own file search.
        if (!usingPhase2RAG && agent.corpusIds && agent.corpusIds.length > 0) {
            options.tools = [{
                fileSearch: {
                    fileSearchStoreNames: agent.corpusIds
                }
            } as any];
        }

        const model = this.genAI.getGenerativeModel(options);

        const chat = model.startChat({
            history: this.formatHistoryForGemini(history),
        });

        // Prepend the retrieved context to the user's message. Header text
        // matches the language so the model parses the Source-N markers under
        // the same locale as the rest of the system prompt.
        const finalMessage = usingPhase2RAG
            ? (language === 'en'
                ? `RETRIEVED CONTEXT (use as primary material and cite per the [Source N: ...] headers):\n\n${retrievedContext}\n\n---\n\nUSER QUESTION: ${message}`
                : `CONTEXTO RECUPERADO (usa esto como material primario y cita según indican los encabezados [Fuente N: ...]):\n\n${retrievedContext}\n\n---\n\nPREGUNTA DEL USUARIO: ${message}`)
            : message;

        const result = await chat.sendMessageStream(finalMessage);

        let fullResponse = '';
        for await (const chunk of result.stream) {
            // Only emit actual text parts — skip thinking/function-call parts
            for (const part of chunk.candidates?.[0]?.content?.parts ?? []) {
                if ('text' in part && typeof part.text === 'string' && !('thought' in part)) {
                    fullResponse += part.text;
                    onChunk(part.text);
                }
            }
        }

        // Extract grounding metadata from File Search (LEGACY Phase 1 only).
        // In Phase 2, sources come from the retrieval step done by the caller.
        if (!usingPhase2RAG && agent.corpusIds && agent.corpusIds.length > 0) {
            try {
                const finalResponse = await result.response;
                const sources = this.extractSourcesFromResponse(finalResponse, agentName);
                if (sources.length > 0 && onSources) onSources(sources);
            } catch (err) {
                console.warn('[GeminiMultiAgent] Could not extract grounding metadata (stream):', err);
            }
        }

        return fullResponse;
    }

    /**
     * Extracts grounding metadata from a final Gemini response into SourceReference[].
     * Shared between streaming and non-streaming paths.
     */
    private extractSourcesFromResponse(finalResponse: any, agentName: string): SourceReference[] {
        const groundingChunks: any[] = finalResponse?.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];

        // Debug: inspect chunk contents to see if markers are present in any form
        const markerRegexes = {
            '[FUENTE:': /\[FUENTE:/,
            '(Fuente:': /\(Fuente:/,
            'Fragmento': /Fragmento\s+\d+/,
        };
        const counts: Record<string, number> = {};
        for (const [name, rx] of Object.entries(markerRegexes)) {
            counts[name] = groundingChunks.filter((c: any) => rx.test(c.retrievedContext?.text ?? '')).length;
        }
        console.log(`[GeminiMultiAgent] Agent: ${agentName} | Total chunks: ${groundingChunks.length} | Markers:`, counts);
        if (groundingChunks[0]) {
            const firstText = (groundingChunks[0].retrievedContext?.text ?? '').substring(0, 500);
            console.log(`[GeminiMultiAgent] First chunk preview:`, firstText);
        }

        // Group by document. Matches three marker formats for backward compat:
        //  - NEW (unique):  "Fragmento N · Autor · "Título" · p. N."
        //  - Inline:        "(Fuente: Autor, "Título", p. N)"
        //  - Legacy:        "[FUENTE: Autor — "Título", Página N]"
        const docMap = new Map<string, SourceReference & { pages: number[] }>();
        const newFormat = /Fragmento\s+\d+\s*·\s*([^·\n]+?)\s*·\s*"([^"]+)"\s*·\s*p\.\s*(\d+)/;
        const inlineFormat = /\(Fuente:\s*([^,\n]+?),\s*"([^"]+)",\s*p\.\s*(\d+)\)/;
        const legacyFormat = /\[FUENTE:\s*([^—\n]+?)\s*—\s*"([^"]+)",?\s*P[aá]gina\s*(\d+)\]/;

        for (const chunk of groundingChunks) {
            const ctx = chunk.retrievedContext ?? chunk.web ?? {};
            const text: string = ctx.text ?? '';
            const m = text.match(newFormat) || text.match(inlineFormat) || text.match(legacyFormat);

            if (m) {
                const author = m[1]?.trim();
                const title = m[2]?.trim();
                const page = m[3] ? parseInt(m[3]) : 0;
                const key = `${author}||${title}`;
                if (docMap.has(key)) {
                    docMap.get(key)!.pages.push(page);
                } else {
                    docMap.set(key, { title, author, pages: [page] });
                }
            } else {
                const storeId: string = ctx.fileSearchStore ?? ctx.uri ?? '';
                if (!storeId || docMap.has(`store||${storeId}`)) continue;
                const readableName = storeId
                    .replace(/^fileSearchStores\//, '')
                    .replace(/^dos-filos-/, '')
                    .replace(/-[a-z0-9]{10,15}$/, '')
                    .split('-')
                    .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(' ');
                docMap.set(`store||${storeId}`, {
                    title: readableName || storeId,
                    pages: [],
                    ...(text && { snippet: text.substring(0, 250).trim() }),
                });
            }
        }

        return Array.from(docMap.values()).map(({ pages, ...src }) => {
            const ref: SourceReference = { title: src.title };
            if (src.author) ref.author = src.author;
            if (pages.length > 0) {
                const sorted = [...new Set(pages)].sort((a, b) => a - b);
                ref.page = sorted[0];
                ref.snippet = `Páginas consultadas: ${sorted.join(', ')}`;
            } else if (src.snippet) {
                ref.snippet = src.snippet;
            }
            return ref;
        });
    }

    async sendMessage(
        agent: AIAgent,
        history: AIChatMessage[],
        message: string,
        lengthPreference?: ResponseMode,
        enableThinking?: boolean,
        language: SupportedLanguage = DEFAULT_LANGUAGE,
    ): Promise<string> {
        const options: any = {
            model: this.modelName,
            systemInstruction: this.buildSystemInstruction(agent, lengthPreference, language),
            generationConfig: enableThinking
                ? {} // Let the model use its default thinking budget
                : { thinkingConfig: { thinkingBudget: 0 } }
        };

        if (agent.corpusIds && agent.corpusIds.length > 0) {
            options.tools = [{
                fileSearch: {
                    fileSearchStoreNames: agent.corpusIds
                }
            } as any];
        }

        const model = this.genAI.getGenerativeModel(options);

        const chat = model.startChat({
            history: this.formatHistoryForGemini(history),
        });

        const result = await chat.sendMessage(message);
        const response = await result.response;
        return response.text();
    }

    async sendMessageWithSources(
        agent: AIAgent,
        history: AIChatMessage[],
        message: string,
        lengthPreference?: ResponseMode,
        language: SupportedLanguage = DEFAULT_LANGUAGE,
    ): Promise<{ response: string; sources: SourceReference[] }> {
        const agentName = resolveLocalized(agent.name, language);
        const options: any = {
            model: this.modelName,
            systemInstruction: this.buildSystemInstruction(agent, lengthPreference, language),
            generationConfig: { thinkingConfig: { thinkingBudget: 0 } },
        };

        if (agent.corpusIds && agent.corpusIds.length > 0) {
            options.tools = [{
                fileSearch: { fileSearchStoreNames: agent.corpusIds }
            } as any];
        }

        const model = this.genAI.getGenerativeModel(options);
        const chat = model.startChat({ history: this.formatHistoryForGemini(history) });

        const result = await chat.sendMessage(message);
        const response = await result.response;
        const text = response.text();

        let sources: SourceReference[] = [];
        if (agent.corpusIds && agent.corpusIds.length > 0) {
            try {
                sources = this.extractSourcesFromResponse(response, agentName);
            } catch (err) {
                console.warn('[GeminiMultiAgent] Could not extract grounding (non-stream):', err);
            }
        }

        return { response: text, sources };
    }
}

