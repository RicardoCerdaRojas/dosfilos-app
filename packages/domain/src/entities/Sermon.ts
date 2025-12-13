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
    status: 'draft' | 'published' | 'archived';
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
    } | undefined;
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
        public status: 'draft' | 'published' | 'archived' = 'draft',
        public createdAt: Date = new Date(),
        public updatedAt: Date = new Date(),
        public publishedAt: Date | undefined = undefined,
        public shareToken: string | undefined = undefined,
        public isShared: boolean = false,
        public authorName: string = 'Pastor',
        public wizardProgress?: Sermon['wizardProgress'],
        public seriesId?: string,
        public scheduledDate?: Date,
        public preachingHistory: PreachingLog[] = []
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
        data: Omit<Sermon, 'id' | 'createdAt' | 'updatedAt' | 'preachingHistory'> & { id?: string, preachingHistory?: PreachingLog[] }
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
            data.status ?? 'draft',
            new Date(),
            new Date(),
            d.publishedAt,
            d.shareToken,
            d.isShared ?? false,
            d.authorName ?? 'Pastor',
            data.wizardProgress,
            data.seriesId,
            data.scheduledDate,
            data.preachingHistory ?? []
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
            data.preachingHistory ?? this.preachingHistory
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
            this.preachingHistory
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
            this.preachingHistory
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
            this.preachingHistory
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
            this.preachingHistory
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
