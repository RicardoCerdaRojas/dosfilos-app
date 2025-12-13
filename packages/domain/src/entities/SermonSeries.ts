export type SeriesType = 'manual' | 'thematic' | 'expository';

// Represents a planned sermon that hasn't been developed yet
export interface PlannedSermon {
    id: string;           // Unique ID for tracking
    week: number;         // Week number in the series
    title: string;
    description: string;
    passage: string;      // 📌 REQUIRED: Biblical passage (e.g. "Romanos 8:28-39")
    scheduledDate?: Date;
    draftId?: string;     // Links to actual draft once started
}

export interface SeriesMetadata {
    thematic?: {
        topic: string;
        subtopics: string[];
    };
    expository?: {
        book: string;
        chapterRange?: string;
        originalLanguageAnalysis?: any;
    };
    plannedSermons?: PlannedSermon[];  // Sermons planned but not yet developed
}

export interface SermonSeries {
    id: string;
    userId: string;
    title: string;
    description: string;
    coverUrl?: string | undefined;
    startDate: Date;
    endDate?: Date | undefined;
    sermonIds: string[];
    draftIds: string[];  // Sermon IDs that are still in the wizard workflow
    type: SeriesType;
    metadata?: SeriesMetadata | undefined;
    resourceIds: string[];
    createdAt: Date;
    updatedAt: Date;
}

export class SermonSeriesEntity implements SermonSeries {
    constructor(
        public id: string,
        public userId: string,
        public title: string,
        public description: string,
        public startDate: Date,
        public sermonIds: string[] = [],
        public draftIds: string[] = [],
        public type: SeriesType = 'manual',
        public resourceIds: string[] = [],
        public coverUrl?: string,
        public endDate?: Date,
        public metadata?: SeriesMetadata,
        public createdAt: Date = new Date(),
        public updatedAt: Date = new Date()
    ) {
        this.validate();
    }

    private validate(): void {
        if (!this.title || this.title.trim().length < 3) {
            throw new Error('El título de la serie debe tener al menos 3 caracteres');
        }
        if (!this.userId) {
            throw new Error('La serie debe tener un usuario asociado');
        }
    }

    static create(
        data: Omit<SermonSeries, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
    ): SermonSeriesEntity {
        return new SermonSeriesEntity(
            data.id ?? crypto.randomUUID(),
            data.userId,
            data.title,
            data.description,
            data.startDate,
            data.sermonIds ?? [],
            data.draftIds ?? [],
            data.type ?? 'manual',
            data.resourceIds ?? [],
            data.coverUrl,
            data.endDate,
            data.metadata,
            new Date(),
            new Date()
        );
    }

    update(data: Partial<Omit<SermonSeries, 'id' | 'userId' | 'createdAt'>>): SermonSeriesEntity {
        return new SermonSeriesEntity(
            this.id,
            this.userId,
            data.title ?? this.title,
            data.description ?? this.description,
            data.startDate ?? this.startDate,
            data.sermonIds ?? this.sermonIds,
            data.draftIds ?? this.draftIds,
            data.type ?? this.type,
            data.resourceIds ?? this.resourceIds,
            data.coverUrl ?? this.coverUrl,
            data.endDate ?? this.endDate,
            data.metadata ?? this.metadata,
            this.createdAt,
            new Date()
        );
    }

    addSermon(sermonId: string): SermonSeriesEntity {
        if (this.sermonIds.includes(sermonId)) {
            return this;
        }
        return this.update({
            sermonIds: [...this.sermonIds, sermonId]
        });
    }

    removeSermon(sermonId: string): SermonSeriesEntity {
        return this.update({
            sermonIds: this.sermonIds.filter(id => id !== sermonId)
        });
    }
}
