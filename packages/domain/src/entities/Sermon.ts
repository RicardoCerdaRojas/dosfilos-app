import { ExegeticalStudy, HomileticalAnalysis, SermonContent } from './SermonGenerator';

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
        // Track if this draft has been published
        publishedCopyId?: string;  // ID of the most recent published copy
        lastPublishedAt?: Date;    // When it was last published
        publishCount?: number;      // How many times it's been published
        planId?: string; // ID of the preaching plan this sermon belongs to
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
        public sourcePaperId?: string
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
            data.sourcePaperId
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
            d.sourcePaperId ?? this.sourcePaperId
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
            this.sourcePaperId
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
            this.sourcePaperId
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
            this.sourcePaperId
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
            this.sourcePaperId
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
            this.sourcePaperId
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
