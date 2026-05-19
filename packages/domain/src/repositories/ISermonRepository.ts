import { SermonEntity } from '../entities/Sermon';

export interface ISermonRepository {
    create(sermon: SermonEntity): Promise<SermonEntity>;
    update(sermon: SermonEntity): Promise<SermonEntity>;
    delete(id: string): Promise<void>;
    findById(id: string): Promise<SermonEntity | null>;
    findByShareToken(token: string): Promise<SermonEntity | null>;
    findByUserId(userId: string, options?: FindOptions): Promise<SermonEntity[]>;
    findAll(options?: FindOptions): Promise<SermonEntity[]>;
    findByDraftId(draftId: string, userId: string): Promise<SermonEntity[]>;
    /**
     * Returns all sermons whose `sourcePaperId` points to the given
     * exegetical paper. Powers the per-paper "Artefactos derivados"
     * panel — every sermon spawned from a paper appears here regardless
     * of which surface (paper detail / planner / dashboard) triggered
     * the generation. Ownership filter mirrors the other queries.
     */
    findBySourcePaperId(userId: string, paperId: string): Promise<SermonEntity[]>;
}

export interface FindOptions {
    limit?: number;
    offset?: number;
    orderBy?: 'createdAt' | 'updatedAt' | 'title';
    order?: 'asc' | 'desc';
    status?: 'working' | 'draft' | 'published' | 'archived';
    tags?: string[];
    category?: string;
}
