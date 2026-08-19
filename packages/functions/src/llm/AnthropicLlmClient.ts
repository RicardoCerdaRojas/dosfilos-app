import Anthropic from '@anthropic-ai/sdk';
import type { ILlmClient, LlmGenerateOptions } from './LlmClient';
import { recordLlmUsage, type LlmUsageContext } from './llmUsageRecorder';

/**
 * Anthropic adapter for the thin `ILlmClient` port (Phase 3, Q1 / ADR-029).
 *
 * Used by the Pastoral Fidelity evaluator callable to escalate `partial` /
 * `contradicts` verdicts from Gemini Flash to Claude Sonnet 4.6 for finer
 * reasoning, when a marker's claim ↔ source relationship is marginal.
 *
 * The Anthropic Messages API does not expose a native JSON-mode toggle the
 * way Gemini does, so when the caller asks for `application/json` we:
 *  1. Append a strict "respond with JSON only" instruction to the system
 *     prompt.
 *  2. Defensively strip any ```json ... ``` fences the model still emits.
 *
 * Retries: the SDK already retries on 429 / 5xx with exponential backoff
 * (default 2 retries). We bump it to 3 for the fidelity evaluator, which is
 * tolerant to a few hundred ms of extra latency.
 */
export class AnthropicLlmClient implements ILlmClient {
    private readonly client: Anthropic;

    /**
     * `usage` identifica QUIÉN gasta (feature + usuario) para el medidor.
     * Sonnet es ~10x el precio de Flash por token, así que acá el dato importa
     * todavía más que en el adapter de Gemini.
     */
    constructor(
        apiKey: string,
        private readonly modelName: string = 'claude-sonnet-4-6',
        private readonly defaultMaxOutputTokens: number = 4096,
        private readonly usage?: LlmUsageContext,
    ) {
        this.client = new Anthropic({ apiKey, maxRetries: 3 });
    }

    async generate(options: LlmGenerateOptions): Promise<string> {
        const wantsJson = options.responseMimeType === 'application/json';
        const system = buildSystem(options.system, wantsJson);

        const response = await this.client.messages.create({
            model: this.modelName,
            max_tokens: options.maxOutputTokens ?? this.defaultMaxOutputTokens,
            temperature: options.temperature ?? 0.2,
            ...(system ? { system } : {}),
            messages: [{ role: 'user', content: options.prompt }],
        });

        // Fire-and-forget: medir nunca puede romper la llamada medida.
        void recordLlmUsage({
            model: this.modelName,
            feature: this.usage?.feature ?? 'unknown',
            userId: this.usage?.userId,
            inputTokens: response.usage?.input_tokens ?? 0,
            outputTokens: response.usage?.output_tokens ?? 0,
        });

        const text = extractText(response);
        return wantsJson ? stripJsonFences(text) : text;
    }
}

function buildSystem(userSystem: string | undefined, wantsJson: boolean): string | undefined {
    if (!wantsJson) {
        return userSystem;
    }
    const jsonInstruction =
        'Respond with valid JSON only. Do not include markdown code fences, prose, or commentary. The entire response MUST be a parseable JSON value.';
    return userSystem ? `${userSystem}\n\n${jsonInstruction}` : jsonInstruction;
}

function extractText(response: Anthropic.Message): string {
    return response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('\n')
        .trim();
}

function stripJsonFences(text: string): string {
    const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
    return fenced ? fenced[1].trim() : text;
}
