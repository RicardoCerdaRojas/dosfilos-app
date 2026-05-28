import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ILlmClient, LlmGenerateOptions } from './LlmClient';

/**
 * Gemini adapter for the thin `ILlmClient` port (Phase 2.5, Q7 / ADR-025).
 *
 * New Pastoral Fidelity callables depend on `ILlmClient`, not on this class
 * directly — swapping the provider (e.g. MiniMax) means writing a sibling
 * adapter and changing the one construction line in the callable. The broad
 * refactor of the legacy direct-SDK callers is a separate tech-debt sprint
 * (memory `tech_debt_llm_provider_abstraction`).
 */
export class GeminiLlmClient implements ILlmClient {
    constructor(
        private readonly apiKey: string,
        private readonly modelName: string = 'gemini-2.5-flash',
    ) {}

    async generate(options: LlmGenerateOptions): Promise<string> {
        const genAI = new GoogleGenerativeAI(this.apiKey);
        const model = genAI.getGenerativeModel({
            model: this.modelName,
            generationConfig: {
                responseMimeType: options.responseMimeType ?? 'text/plain',
                temperature: options.temperature ?? 0.2,
                ...(options.maxOutputTokens ? { maxOutputTokens: options.maxOutputTokens } : {}),
            },
        });
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: options.prompt }] }],
            ...(options.system ? { systemInstruction: options.system } : {}),
        });
        return result.response.text();
    }
}
