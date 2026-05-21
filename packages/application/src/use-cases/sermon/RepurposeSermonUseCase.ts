import {
    DEFAULT_LANGUAGE,
    type Extraction,
    type ExtractionType,
    type IExtractionRepository,
    type ISermonRepository,
    type ISermonRepurposer,
    type SermonRepurposeKind,
    type SupportedLanguage,
} from '@dosfilos/domain';

export interface RepurposeSermonInput {
    actorUserId: string;
    sermonId: string;
    kind: SermonRepurposeKind;
    language?: SupportedLanguage;
}

/**
 * Generates a derivative artifact (devotional or study guide) from a
 * published sermon and persists it as an `Extraction` with
 * `externalRef = { collection: 'sermons', id: sermonId }`. The artifact
 * surfaces in "Mis Recursos" alongside Faculty-generated content (one
 * library for all derivatives, regardless of origin).
 *
 * Disambiguation with the existing `SERMON` extraction mirror:
 *   - `type === 'SERMON'` with externalRef→sermon → canonical mirror
 *     (PR #153 pattern).
 *   - `type !== 'SERMON'` with externalRef→sermon → derivative of that
 *     sermon (this use case).
 *
 * Audit T3 #18. v1 ships two kinds; later phases add bulletin /
 * small-group-guide / social-clips by adding new ExtractionType values
 * + prompt builders without touching this use case.
 */
export class RepurposeSermonUseCase {
    constructor(
        private readonly sermonRepository: ISermonRepository,
        private readonly extractionRepository: IExtractionRepository,
        private readonly repurposer: ISermonRepurposer,
    ) { }

    async execute(input: RepurposeSermonInput): Promise<Extraction> {
        const sermon = await this.sermonRepository.findById(input.sermonId);
        if (!sermon) {
            throw new Error('Sermón no encontrado');
        }
        if (sermon.userId !== input.actorUserId) {
            throw new Error('No tienes acceso a este sermón');
        }
        const sermonBody = pickSermonBodyMarkdown(sermon);
        if (!sermonBody.trim()) {
            throw new Error('El sermón no tiene contenido para reutilizar');
        }

        const language = input.language ?? DEFAULT_LANGUAGE;
        const passage = sermon.bibleReferences?.[0] ?? sermon.title ?? '';

        const result = await this.repurposer.repurpose(input.kind, {
            sermonTitle: sermon.title ?? '',
            passage,
            sermonMarkdown: sermonBody,
            language,
        });

        const extraction = await this.extractionRepository.create({
            userId: input.actorUserId,
            sessionId: null,
            type: mapKindToExtractionType(input.kind),
            title: result.title,
            markdown: result.markdown,
            derivedFromMessageIds: [],
            externalRef: { collection: 'sermons', id: sermon.id },
            projectIds: sermon.projectId ? [sermon.projectId] : [],
        });
        return extraction;
    }
}

function mapKindToExtractionType(kind: SermonRepurposeKind): ExtractionType {
    return kind === 'devotional' ? 'DEVOTIONAL' : 'BIBLE_STUDY';
}

function pickSermonBodyMarkdown(sermon: {
    content?: string;
    wizardProgress?: { draft?: unknown };
}): string {
    if (typeof sermon.content === 'string' && sermon.content.trim()) {
        return sermon.content;
    }
    // Fallback: stringify the draft if `content` hasn't been populated
    // yet (rare — happens when the sermon is still in-progress and
    // hasn't run the publish flow that copies draft → content).
    const draft = sermon.wizardProgress?.draft;
    if (draft && typeof draft === 'object') {
        try {
            return JSON.stringify(draft);
        } catch {
            return '';
        }
    }
    return '';
}
