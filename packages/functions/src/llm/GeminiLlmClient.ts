import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ILlmClient, LlmGenerateOptions } from './LlmClient';
import { recordLlmUsage, type LlmUsageContext } from './llmUsageRecorder';

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
    /**
     * `usage` identifica QUIÉN gasta (feature + usuario) para el medidor. Es
     * opcional para no romper callers viejos, pero sin él el gasto aparece bajo
     * `unknown` — que es exactamente el agujero que el medidor viene a tapar.
     */
    constructor(
        private readonly apiKey: string,
        private readonly modelName: string = 'gemini-2.5-flash',
        private readonly usage?: LlmUsageContext,
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
        // El consumo viene en la respuesta y hasta ahora se descartaba.
        // Fire-and-forget: medir nunca puede romper la llamada medida.
        const meta = result.response.usageMetadata;
        void recordLlmUsage({
            model: this.modelName,
            feature: this.usage?.feature ?? 'unknown',
            userId: this.usage?.userId,
            inputTokens: meta?.promptTokenCount ?? 0,
            outputTokens: meta?.candidatesTokenCount ?? 0,
        });
        return result.response.text();
    }
}
