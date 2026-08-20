import type {
    ISermonRepurposer,
    SermonRepurposeKind,
    SermonRepurposerInput,
    SermonRepurposerOutput,
} from '@dosfilos/domain';
import { withGeminiRetry } from '../exegesis/geminiRetry';
import { runLlmPromptWithUsage } from '../llm/callableLlm';
import { buildDevotionalDefaultTitle, buildDevotionalPrompt } from './promptDevotional';
import { buildStudyGuideDefaultTitle, buildStudyGuidePrompt } from './promptStudyGuide';

/**
 * Gemini implementation of `ISermonRepurposer` (audit T3 #18). Single-
 * shot generation per kind — each call produces one full markdown
 * artifact. Reuses Flash 2.5 (same model as the wizard's draft
 * generator) because the input sermon is already polished and the task
 * is reorganization plus voice-shift, not novel reasoning.
 */
export class GeminiSermonRepurposer implements ISermonRepurposer {
    private modelName: string;

    constructor(modelName?: string) {
        this.modelName = modelName || 'gemini-2.5-flash';
    }

    async repurpose(kind: SermonRepurposeKind, input: SermonRepurposerInput): Promise<SermonRepurposerOutput> {
        const prompt = kind === 'devotional'
            ? buildDevotionalPrompt(input)
            : buildStudyGuidePrompt(input);
        const defaultTitle = kind === 'devotional'
            ? buildDevotionalDefaultTitle(input)
            : buildStudyGuideDefaultTitle(input);

        const { text, tokensUsed } = await withGeminiRetry(
            () => runLlmPromptWithUsage({
                feature: `sermon.repurpose.${kind}`,
                model: this.modelName,
                prompt,
                // Slightly higher than analyzer (0.5) — devotional /
                // study-guide prose benefits from warmth and rhythm but
                // must stay anchored to the sermon's claims.
                temperature: 0.55,
                topP: 0.9,
                maxOutputTokens: 8192,
            }),
            { contextLabel: `GeminiSermonRepurposer:${kind}` },
        );
        const markdown = text.trim();

        const extractedTitle = extractTitleFromMarkdown(markdown);
        return {
            markdown,
            title: extractedTitle || defaultTitle,
            modelId: this.modelName,
            tokensUsed,
        };
    }
}

function extractTitleFromMarkdown(markdown: string): string | null {
    const match = markdown.match(/^#\s+(.+?)\s*$/m);
    if (!match) return null;
    const title = match[1].trim();
    return title.length > 0 && title.length <= 200 ? title : null;
}
