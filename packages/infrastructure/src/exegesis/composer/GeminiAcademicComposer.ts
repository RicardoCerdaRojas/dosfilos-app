import { GoogleGenerativeAI } from '@google/generative-ai';
import {
    type ComposeAcademicPaperInput,
    type ComposeAcademicPaperOutput,
    type IAcademicComposer,
} from '@dosfilos/domain';
import { withGeminiRetry } from '../geminiRetry';
import { buildComposerPrompt } from './composerPrompts';

/**
 * Gemini implementation of `IAcademicComposer`.
 *
 * Composes a TMS-style academic paper from pre-completed
 * `CanonicalVerseAnalysis` artifacts. The model receives:
 *   - structured verse briefings (one per verse)
 *   - the source registry (citation keys → metadata for bibliography)
 *   - the style guide content + structured manifest
 *
 * And produces a single markdown document with:
 *   - Title + Introduction + verse-by-verse body + Conclusion
 *   - Inline citations distributed across paragraphs
 *   - Footnote markers `[^N]` + footnote bodies at the end
 *   - Bibliography rendered per the style guide
 *
 * Configuration choices:
 *   - Model: Pro 2.5 by default. Composition is reasoning-heavy
 *     (paragraph cohesion, transition tissue, citation placement) —
 *     Pro outperforms Flash here.
 *   - Temperature: 0.4. Higher than the analyzer's 0.3 because
 *     prose-cohesion benefits from slightly more variation in
 *     paragraph openers and connective phrases. Still well below
 *     creative range.
 *   - Output tokens: 65k cap. A typical TMS paper for a 4-7 verse
 *     pericope runs 12-25 pages of markdown ≈ 25-50k tokens. The
 *     65k ceiling provides headroom for dense passages and
 *     comprehensive footnote sections.
 *
 * The composer does NOT apply the deterministic style formatter —
 * that's the use case's responsibility (post-process). The composer
 * just produces the LLM-generated markdown.
 */
export class GeminiAcademicComposer implements IAcademicComposer {
    private genAI: GoogleGenerativeAI;
    private modelName: string;

    constructor(apiKey: string, modelName?: string) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.modelName = modelName || 'gemini-2.5-pro';
    }

    async composeAcademicPaper(input: ComposeAcademicPaperInput): Promise<ComposeAcademicPaperOutput> {
        const { systemInstruction, userMessage } = buildComposerPrompt(input);

        const model = this.genAI.getGenerativeModel({
            model: this.modelName,
            systemInstruction,
            generationConfig: {
                temperature: 0.4,
                topP: 0.9,
                maxOutputTokens: 65536,
            },
        });

        console.log('[GeminiAcademicComposer] composing', {
            verseCount: input.verseAnalyses.length,
            sourceCount: input.sources.length,
            hasStyleGuide: Boolean(input.styleGuideContent || input.styleGuideManifest),
            language: input.language,
        });

        const result = await withGeminiRetry(
            () => model.generateContent(userMessage),
            { contextLabel: 'GeminiAcademicComposer' },
        );
        const markdown = result.response.text();
        const tokensUsed = result.response.usageMetadata?.totalTokenCount ?? null;

        // The composer always returns 'skipped' here — formatter
        // status is determined by the use case AFTER it runs the
        // deterministic formatter. The adapter has no opinion on
        // formatter outcome; it only knows about the LLM step.
        return {
            markdown,
            modelId: this.modelName,
            tokensUsed,
            formatterStatus: 'skipped',
        };
    }
}
