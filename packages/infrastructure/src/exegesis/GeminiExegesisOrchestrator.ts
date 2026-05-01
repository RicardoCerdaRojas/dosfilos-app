import { GoogleGenerativeAI } from '@google/generative-ai';
import type {
    ExegesisGenerationInput,
    ExegesisGenerationOutput,
    IExegesisOrchestrator,
} from '@dosfilos/domain';
import { buildPrompt } from './prompts';

/**
 * Gemini implementation of `IExegesisOrchestrator`.
 *
 * v1 design:
 *   - Pro 2.5 + thinking. Pro is required by the citation-discipline
 *     promise — Flash hallucinates page numbers and authors with
 *     enough frequency that we can't ship it for academic work.
 *     Thinking gives the model room to reason about which sources
 *     support which claims before committing to citations.
 *   - Non-streaming. The state-machine UI already renders a generic
 *     "generating" spinner; partial output streaming adds a lot of
 *     plumbing for marginal v1 value. v1.5 wires streaming so the
 *     user can read as it goes.
 *   - Inline context, no embedding-based retrieval. The use case
 *     fetches the full text of the configured style guide + project
 *     sources and the prompt builder packs them into the system /
 *     user messages with per-role budgets. Pro's 1M+ context window
 *     comfortably absorbs a typical TMS guide (~50k chars) plus 5-7
 *     commentary extracts (~30k chars each). Embedding-based
 *     retrieval is v1.5 work — needed when papers grow to chapter-
 *     range scope or sources to 20+ items.
 *
 * Token accounting: `usageMetadata.totalTokenCount` is recorded on the
 * step version so cost analysis can attribute spend per paper / per
 * step kind.
 */
export class GeminiExegesisOrchestrator implements IExegesisOrchestrator {
    private genAI: GoogleGenerativeAI;
    private modelName: string;

    constructor(apiKey: string, modelName?: string) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        // Default to Pro 2.5. The vision model env var is reused because
        // both use cases want the same Pro tier; a dedicated env var can
        // split them later if exegesis ends up needing a different model.
        this.modelName = modelName || 'gemini-2.5-pro';
    }

    async generateStep(input: ExegesisGenerationInput): Promise<ExegesisGenerationOutput> {
        const { systemInstruction, userMessage } = buildPrompt(input);

        const model = this.genAI.getGenerativeModel({
            model: this.modelName,
            systemInstruction,
            generationConfig: {
                // Pro 2.5 rejects thinkingBudget: 0 — leaving thinking on
                // its default budget here. The reasoning bandwidth is the
                // whole point of using Pro for exegesis.
                maxOutputTokens: 8192,
                temperature: 0.5,
                topP: 0.9,
            },
        });

        console.log('[GeminiExegesisOrchestrator] generating', {
            kind: input.kind,
            language: input.language,
            sourcesCount: input.sources.length,
            priorStepsCount: input.priorAcceptedSteps.length,
            hint: input.regenerationHint,
            styleGuideChars: input.styleGuideContent.length,
        });

        const result = await model.generateContent(userMessage);
        const response = result.response;
        const markdown = response.text();

        const usage = response.usageMetadata;
        const totalTokens = usage?.totalTokenCount;
        const summed = (usage?.promptTokenCount ?? 0) + (usage?.candidatesTokenCount ?? 0);
        const tokensUsed = typeof totalTokens === 'number' ? totalTokens : (summed > 0 ? summed : null);

        return {
            markdown,
            modelId: this.modelName,
            tokensUsed,
        };
    }
}
