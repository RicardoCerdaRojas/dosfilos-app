import { GoogleGenerativeAI } from '@google/generative-ai';
import {
    type ComposeVerseInput,
    type ComposeVerseOutput,
    type IVerseAcademicComposer,
} from '@dosfilos/domain';
import { withGeminiRetry } from '../geminiRetry';
import { buildVerseProsePrompt } from './verseProsePrompt';

/**
 * Gemini implementation of `IVerseAcademicComposer`. Single-verse
 * sibling of `GeminiAcademicComposer`. Same model + retry policy,
 * different prompt scaffolding.
 *
 * Configuration:
 *   - Model: Pro 2.5 (configurable). Composition is reasoning-heavy
 *     even for one verse — Pro outperforms Flash on prose cohesion +
 *     citation placement at this scale.
 *   - Temperature: 0.4. Same as the whole-paper composer.
 *   - Output tokens: 8 192 cap. A 1-3 paragraph academic verse runs
 *     ~600-1 500 tokens; the cap leaves headroom for dense verses
 *     with multiple cruxes / commentator engagements.
 *
 * The composer always returns `formatterStatus: 'skipped'` — the use
 * case applies the deterministic style formatter post-hoc.
 */
export class GeminiVerseAcademicComposer implements IVerseAcademicComposer {
    private genAI: GoogleGenerativeAI;
    private modelName: string;

    constructor(apiKey: string, modelName?: string) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.modelName = modelName || 'gemini-2.5-pro';
    }

    async composeVerse(input: ComposeVerseInput): Promise<ComposeVerseOutput> {
        const { systemInstruction, userMessage } = buildVerseProsePrompt(input);

        const model = this.genAI.getGenerativeModel({
            model: this.modelName,
            systemInstruction,
            generationConfig: {
                temperature: 0.4,
                topP: 0.9,
                maxOutputTokens: 8192,
            },
        });

        const result = await withGeminiRetry(
            () => model.generateContent(userMessage),
            { contextLabel: 'GeminiVerseAcademicComposer' },
        );
        const markdown = result.response.text();
        const tokensUsed = result.response.usageMetadata?.totalTokenCount ?? null;

        return {
            markdown,
            modelId: this.modelName,
            tokensUsed,
            formatterStatus: 'skipped',
        };
    }
}
