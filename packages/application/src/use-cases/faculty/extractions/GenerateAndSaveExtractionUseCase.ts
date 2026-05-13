import {
    Extraction,
    ExtractionType,
    IAIChatRepository,
    IExtractionRepository,
    SermonPersonalization,
    DEFAULT_LANGUAGE,
} from '@dosfilos/domain';
import type { SupportedLanguage } from '@dosfilos/domain';
import {
    ApprovedSermonOutline,
    ExtractTheologicalContentUseCase,
} from '../ExtractTheologicalContentUseCase';

/**
 * Derives a human-readable title from the generated markdown. Strategy:
 *
 * 1. First `# H1` line — most templates lead with the document title.
 * 2. First non-empty paragraph trimmed to 80 chars — fallback for
 *    templates that don't start with a heading.
 * 3. Type label (e.g. "Bosquejo de Sermón") — final fallback. The web
 *    layer can map the type to a localized label and pass it in via
 *    `fallbackTitle`.
 */
function deriveTitle(markdown: string, fallbackTitle: string): string {
    const h1 = markdown.match(/^\s*#\s+(.+?)\s*$/m);
    if (h1 && h1[1].trim()) return h1[1].trim().slice(0, 120);

    const firstParagraph = markdown
        .split('\n')
        .map(l => l.trim())
        .find(l => l.length > 0 && !l.startsWith('>') && !l.startsWith('#'));
    if (firstParagraph) return firstParagraph.slice(0, 80) + (firstParagraph.length > 80 ? '…' : '');

    return fallbackTitle;
}

/**
 * Orchestrator that runs the existing extraction generation flow and
 * persists the result as an `Extraction` document. Returns the saved
 * entity so the caller can navigate to it / surface a toast / etc.
 *
 * The persistence step is part of the same logical operation as
 * generation — if the LLM call fails, nothing is saved; if generation
 * succeeds but persistence fails, we throw so the user knows the
 * artifact is not safely stored (and the markdown stays in the chunk
 * stream for them to copy as a fallback).
 */
export class GenerateAndSaveExtractionUseCase {
    constructor(
        private readonly extractTheologicalContent: ExtractTheologicalContentUseCase,
        private readonly chatRepository: IAIChatRepository,
        private readonly extractionRepository: IExtractionRepository,
    ) {}

    async execute(params: {
        userId: string;
        sessionId: string;
        type: ExtractionType;
        approvedOutline?: ApprovedSermonOutline;
        personalization?: SermonPersonalization;
        onChunk?: (chunk: string) => void;
        language?: SupportedLanguage;
        fallbackTitle: string;
    }): Promise<Extraction> {
        const {
            userId,
            sessionId,
            type,
            approvedOutline,
            personalization,
            onChunk,
            language = DEFAULT_LANGUAGE,
            fallbackTitle,
        } = params;

        // Snapshot the session BEFORE generation so derivedFromMessageIds
        // captures the messages that fed the extraction (not any chunks
        // streamed afterwards).
        const session = await this.chatRepository.getSession(userId, sessionId);
        const derivedFromMessageIds = session?.messages.map(m => m.id) ?? [];

        const markdown = await this.extractTheologicalContent.execute(
            userId,
            sessionId,
            type,
            approvedOutline,
            personalization,
            onChunk,
            language,
        );

        const title = deriveTitle(markdown, fallbackTitle);

        return this.extractionRepository.create({
            userId,
            sessionId,
            type,
            title,
            markdown,
            derivedFromMessageIds,
        });
    }
}
