import { CitationManifest, ExegeticalStudy, HomileticalAnalysis, RAGSource, SermonContent } from './SermonGenerator';
import type { SermonPersonalization } from './SermonPersonalization';
import { aggregateRagSourcesFlat } from '../services/aggregateRagSources';

export interface PreachingLog {
    date: Date;
    location: string;
    durationMinutes: number;
    notes?: string;
}

export interface Sermon {
    id: string;
    userId: string;
    title: string;
    content: string;
    bibleReferences: string[];
    tags: string[];
    category?: string | undefined;
    status: 'working' | 'draft' | 'published' | 'archived';
    createdAt: Date;
    updatedAt: Date;
    publishedAt?: Date | undefined;
    shareToken?: string | undefined;
    isShared: boolean;
    authorName: string;

    // Series and History
    seriesId?: string | undefined;
    scheduledDate?: Date | undefined;  // Planned preaching date from planner
    preachingHistory: PreachingLog[];

    // Wizard progress for in-progress sermons
    wizardProgress?: {
        currentStep: number;
        passage: string;
        exegesis?: ExegeticalStudy;
        homiletics?: HomileticalAnalysis;
        draft?: SermonContent;
        lastSaved: Date;
        cacheName?: string;
        selectedResourceIds?: string[];
        /**
         * Optional pastoral personalization captured in PromptSettings.
         * When present, the draft prompt prepends a "Voz del Predicador"
         * block (situational context, congregation, illustrations…) so
         * the wizard reaches Faculty parity for occasion-specific
         * sermons (funerals, weddings, crisis preaching).
         *
         * Note: `personalization.tone` is intentionally NOT surfaced in
         * the wizard panel — narrative voice lives in `GenerationRules.tone`
         * (pastoral/expositivo/narrativo). Personalization.tone is the
         * Faculty-only occasion posture (doxological/confrontational/…)
         * and stays out of the wizard form to avoid two tone selectors.
         */
        personalization?: SermonPersonalization;
        /**
         * Audience rigor tier (T3 #19). Mirrors `GenerationRules.audienceRigor`
         * so the wizard's pre-gen choice survives a refresh. 'beginner' is
         * the default and is left implicit (undefined) to keep legacy
         * sermons untouched.
         */
        audienceRigor?: 'beginner' | 'seminary';
        // Track if this draft has been published
        publishedCopyId?: string;  // ID of the most recent published copy
        lastPublishedAt?: Date;    // When it was last published
        publishCount?: number;      // How many times it's been published
        planId?: string; // ID of the preaching plan this sermon belongs to
        /**
         * Provenance of any pre-population that happened at creation
         * time. Each wizard Step inspects this field to render a
         * "Pre-cargado desde {origen}" banner so the user knows the
         * source + can opt into regenerating with the wizard's native
         * generators if they want deeper detail.
         *
         * Absent for sermons created from scratch via the standalone
         * wizard flow. Discriminated union by `kind`:
         *   - 'paper'   → generated from an `ExegeticalPaper`.
         *   - 'faculty' → generated from a Faculty conversation
         *                 (outline + optional pastoral personalization).
         */
        derivedContext?:
            | {
                  kind: 'paper';
                  paperId: string;
                  paperTitle: string;
                  tone: 'pastoral' | 'expositivo' | 'narrativo';
                  generatedAt: Date;
                  transformerModelId: string;
              }
            | {
                  kind: 'faculty';
                  sessionId: string;
                  sessionTitle: string;
                  /**
                   * The outline the user approved in
                   * `SermonOutlinePreviewModal` before generation. Kept
                   * so a wizard regenerate can re-run with the same
                   * structure without forcing the user to re-edit.
                   */
                  outline: {
                      title: string;
                      passage: string;
                      proposition: string;
                      points: { title: string; verses: string }[];
                  };
                  /**
                   * Optional personalization (tone, illustrations,
                   * notes) the user attached. Persisted so wizard
                   * refinement calls can keep injecting it without
                   * losing the pastoral framing.
                   */
                  personalization?: Record<string, unknown>;
                  generatedAt: Date;
              };
    } | undefined;

    // If this is a published copy, references the original draft sermon
    sourceSermonId?: string | undefined;

    // Link back to the faculty study session this sermon was generated from
    sourceFacultySessionId?: string | undefined;

    /**
     * Optional link to the project this sermon belongs to. Established by:
     *  - the legacy migration (assigns orphan sermons to a "Material previo" project per user)
     *  - new sermons created from within a project workspace
     * Sermons without a `projectId` are still valid (free-form / pre-migration).
     */
    projectId?: string | undefined;

    /**
     * Optional link to the ExegeticalPaper this sermon was generated from.
     * Set by the paper → sermon transformer (Phase 2 of the pipeline) so
     * the sermon detail view can deep-link back to the source paper and
     * faculty enrichment can pull paper context.
     */
    sourcePaperId?: string | undefined;

    /**
     * Sources from the user's library that fed the generation prompt
     * via RAG retrieval. Populated when the wizard's `wizardProgress
     * .draft.ragSources` is copied into the published sermon — see
     * `publishAsCopy()`. The sermon detail page renders a "📚 Fuentes
     * consultadas" section so the pastor can see which library docs
     * shaped the output (transparency + later study). v1 ships the
     * list; v2 will add inline footnote markers (`[^1]`) that tie
     * specific prose sections back to a source. Undefined for sermons
     * generated without library context (standalone wizard with empty
     * library, or pre-RAG legacy content).
     */
    bibliography?: RAGSource[];

    /**
     * Phase B citation manifest snapshot. Captured at generation time
     * and persisted alongside `content` so the published view can
     * render inline `[N]` markers as interactive popovers without
     * re-running RAG retrieval. The manifest's `entries[idx].sourceId`
     * lines up 1:1 with the bare ordinals the validator left in the
     * prose. Absent on pre-Phase-B sermons — the renderer falls back
     * to bibliography-only mode in that case.
     */
    citationManifest?: CitationManifest;

    /**
     * Phase 2.5 PR C (ADR-027) — Snapshot of the pastor's study coverage
     * (7 dimensions of the `pastoralSeed`) captured at the moment this
     * sermon was generated from the seed. Immutable record used by Fase 4
     * ("Sello propio" badge) + override-rate metrics. Pre-Phase-2.5
     * sermons have this `undefined`; the badge falls back to "no data".
     */
    studyDepthSnapshot?: import('./StudyDepthAssessment').StudyDepthSnapshot;
}

export class SermonEntity implements Sermon {
    constructor(
        public id: string,
        public userId: string,
        public title: string,
        public content: string,
        public bibleReferences: string[] = [],
        public tags: string[] = [],
        public category: string | undefined = undefined,
        public status: 'working' | 'draft' | 'published' | 'archived' = 'working',
        public createdAt: Date = new Date(),
        public updatedAt: Date = new Date(),
        public publishedAt: Date | undefined = undefined,
        public shareToken: string | undefined = undefined,
        public isShared: boolean = false,
        public authorName: string = 'Pastor',
        public wizardProgress?: Sermon['wizardProgress'],
        public seriesId?: string,
        public scheduledDate?: Date,
        public preachingHistory: PreachingLog[] = [],
        public sourceSermonId?: string,
        public sourceFacultySessionId?: string,
        public projectId?: string,
        public sourcePaperId?: string,
        public bibliography?: RAGSource[],
        public citationManifest?: CitationManifest,
        public studyDepthSnapshot?: Sermon['studyDepthSnapshot']
    ) {
        this.validate();
    }

    private validate(): void {
        if (!this.title || this.title.trim().length < 5) {
            throw new Error('El título debe tener al menos 5 caracteres');
        }
        if (this.title.length > 200) {
            throw new Error('El título no puede exceder 200 caracteres');
        }
        // Allow empty content for draft sermons (wizard in progress)
        if (this.status !== 'draft' && (!this.content || this.content.trim().length === 0)) {
            throw new Error('El contenido no puede estar vacío');
        }
        if (!this.userId) {
            throw new Error('El sermón debe tener un usuario asociado');
        }
    }

    static create(
        data: Pick<Sermon, 'userId' | 'title' | 'content'>
            & Partial<Omit<Sermon, 'userId' | 'title' | 'content' | 'id'>>
            & { id?: string; preachingHistory?: PreachingLog[] }
    ): SermonEntity {
        const d = data as any;
        return new SermonEntity(
            data.id ?? crypto.randomUUID(),
            data.userId,
            data.title,
            data.content,
            data.bibleReferences ?? [],
            data.tags ?? [],
            data.category,
            data.status ?? 'working',
            // Honor caller-provided timestamps (deserialization from
            // Firestore needs to preserve the actual creation/update
            // dates). Fall back to `now` only when caller doesn't
            // supply them — that's the "fresh sermon being created
            // for the first time" case.
            data.createdAt ?? new Date(),
            data.updatedAt ?? new Date(),
            d.publishedAt,
            d.shareToken,
            d.isShared ?? false,
            d.authorName ?? 'Pastor',
            data.wizardProgress,
            data.seriesId,
            data.scheduledDate,
            data.preachingHistory ?? [],
            data.sourceSermonId,
            data.sourceFacultySessionId,
            data.projectId,
            data.sourcePaperId,
            data.bibliography ?? (data as any).bibliography,
            data.citationManifest,
            data.studyDepthSnapshot
        );
    }

    update(data: Partial<Omit<Sermon, 'id' | 'userId' | 'createdAt'>>): SermonEntity {
        const d = data as any;
        return new SermonEntity(
            this.id,
            this.userId,
            data.title ?? this.title,
            data.content ?? this.content,
            data.bibleReferences ?? this.bibleReferences,
            data.tags ?? this.tags,
            data.category ?? this.category,
            data.status ?? this.status,
            this.createdAt,
            new Date(),
            d.publishedAt ?? this.publishedAt,
            d.shareToken ?? this.shareToken,
            d.isShared ?? this.isShared,
            d.authorName ?? this.authorName,
            data.wizardProgress ?? this.wizardProgress,
            data.seriesId ?? this.seriesId,
            data.scheduledDate ?? this.scheduledDate,
            data.preachingHistory ?? this.preachingHistory,
            d.sourceSermonId ?? this.sourceSermonId,
            d.sourceFacultySessionId ?? this.sourceFacultySessionId,
            d.projectId ?? this.projectId,
            d.sourcePaperId ?? this.sourcePaperId,
            data.bibliography ?? this.bibliography,
            data.citationManifest ?? this.citationManifest,
            data.studyDepthSnapshot ?? this.studyDepthSnapshot
        );
    }

    publish(): SermonEntity {
        return new SermonEntity(
            this.id,
            this.userId,
            this.title,
            this.content,
            this.bibleReferences,
            this.tags,
            this.category,
            'published',
            this.createdAt,
            new Date(),
            new Date(),
            this.shareToken,
            this.isShared,
            this.authorName,
            this.wizardProgress,
            this.seriesId,
            this.scheduledDate,
            this.preachingHistory,
            this.sourceSermonId,
            this.sourceFacultySessionId,
            this.projectId,
            this.sourcePaperId,
            this.bibliography ?? aggregateRagSourcesFlat({
                exegesisSources: this.wizardProgress?.exegesis?.ragSources,
                homileticsSources: this.wizardProgress?.homiletics?.ragSources,
                draftSources: this.wizardProgress?.draft?.ragSources,
            }),
            this.citationManifest ?? this.wizardProgress?.draft?.citationManifest,
            this.studyDepthSnapshot
        );
    }

    /**
     * Creates a published COPY of this sermon with a new ID.
     * The copy references this sermon as the source (sourceSermonId).
     * Used when publishing from the wizard without losing the draft.
     */
    publishAsCopy(): SermonEntity {
        // Use draft content from wizardProgress if main content is empty
        let draftContent = '';
        if (this.wizardProgress?.draft) {
            const draft = this.wizardProgress.draft;
            draftContent = `${draft.title}\n\n${draft.introduction}\n\n`;
            draft.body.forEach((point) => {
                draftContent += `${point.point}\n\n${point.content}\n\n`;
            });
            draftContent += draft.conclusion;
        }
        const contentToPublish = this.content || draftContent || '';
        const titleToPublish = this.title || this.wizardProgress?.passage || 'Sermón';

        return new SermonEntity(
            crypto.randomUUID(), // New ID for the copy
            this.userId,
            titleToPublish,
            contentToPublish,
            this.bibleReferences,
            this.tags,
            this.category,
            'published',
            new Date(), // New creation date
            new Date(),
            new Date(), // Published now
            undefined, // No share token yet
            false,
            this.authorName,
            undefined, // Don't copy wizardProgress to published version
            this.seriesId,
            this.scheduledDate,
            [],
            this.id, // Link back to the source draft
            this.sourceFacultySessionId,
            this.projectId,
            this.sourcePaperId,
            this.bibliography ?? aggregateRagSourcesFlat({
                exegesisSources: this.wizardProgress?.exegesis?.ragSources,
                homileticsSources: this.wizardProgress?.homiletics?.ragSources,
                draftSources: this.wizardProgress?.draft?.ragSources,
            }),
            this.citationManifest ?? this.wizardProgress?.draft?.citationManifest,
            this.studyDepthSnapshot
        );
    }

    archive(): SermonEntity {
        return new SermonEntity(
            this.id,
            this.userId,
            this.title,
            this.content,
            this.bibleReferences,
            this.tags,
            this.category,
            'archived',
            this.createdAt,
            new Date(),
            this.publishedAt,
            this.shareToken,
            this.isShared,
            this.authorName,
            this.wizardProgress,
            this.seriesId,
            this.scheduledDate,
            this.preachingHistory,
            this.sourceSermonId,
            this.sourceFacultySessionId,
            this.projectId,
            this.sourcePaperId,
            this.bibliography,
            this.citationManifest,
            this.studyDepthSnapshot
        );
    }

    enableSharing(): SermonEntity {
        return new SermonEntity(
            this.id,
            this.userId,
            this.title,
            this.content,
            this.bibleReferences,
            this.tags,
            this.category,
            this.status,
            this.createdAt,
            new Date(),
            this.publishedAt,
            this.shareToken ?? crypto.randomUUID(),
            true,
            this.authorName,
            this.wizardProgress,
            this.seriesId,
            this.scheduledDate,
            this.preachingHistory,
            this.sourceSermonId,
            this.sourceFacultySessionId,
            this.projectId,
            this.sourcePaperId,
            this.bibliography,
            this.citationManifest,
            this.studyDepthSnapshot
        );
    }

    disableSharing(): SermonEntity {
        return new SermonEntity(
            this.id,
            this.userId,
            this.title,
            this.content,
            this.bibleReferences,
            this.tags,
            this.category,
            this.status,
            this.createdAt,
            new Date(),
            this.publishedAt,
            this.shareToken,
            false,
            this.authorName,
            this.wizardProgress,
            this.seriesId,
            this.scheduledDate,
            this.preachingHistory,
            this.sourceSermonId,
            this.sourceFacultySessionId,
            this.projectId,
            this.sourcePaperId,
            this.bibliography,
            this.citationManifest,
            this.studyDepthSnapshot
        );
    }

    addPreachingLog(log: PreachingLog): SermonEntity {
        return this.update({
            preachingHistory: [...this.preachingHistory, log]
        });
    }

    assignToSeries(seriesId: string): SermonEntity {
        return this.update({ seriesId });
    }

    removeFromSeries(): SermonEntity {
        return this.update({ seriesId: undefined } as any);
    }
}
