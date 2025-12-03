import { ExegeticalStudy, HomileticalAnalysis, SermonContent } from './SermonGenerator';

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
    shareToken?: string;
    isShared: boolean;
    authorName: string;

    // Wizard progress for in-progress sermons
    wizardProgress?: {
        currentStep: number;
        passage: string;
        exegesis?: ExegeticalStudy;
        homiletics?: HomileticalAnalysis;
        draft?: SermonContent;
        lastSaved: Date;
    };
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
        public wizardProgress?: Sermon['wizardProgress']
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
        data: Omit<Sermon, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
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
            data.wizardProgress
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
            data.wizardProgress ?? this.wizardProgress
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
            this.authorName
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
            this.authorName
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
            this.authorName
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
            this.authorName
        );
    }
}
