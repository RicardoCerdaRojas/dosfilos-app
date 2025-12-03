import { SermonEntity } from '../entities/Sermon';

export interface ISermonRepository {
    create(sermon: SermonEntity): Promise<SermonEntity>;
    update(sermon: SermonEntity): Promise<SermonEntity>;
    delete(id: string): Promise<void>;
    findById(id: string): Promise<SermonEntity | null>;
    findByShareToken(token: string): Promise<SermonEntity | null>;
    findByUserId(userId: string, options?: FindOptions): Promise<SermonEntity[]>;
    findAll(options?: FindOptions): Promise<SermonEntity[]>;
}

export interface FindOptions {
    limit?: number;
    offset?: number;
    orderBy?: 'createdAt' | 'updatedAt' | 'title';
    order?: 'asc' | 'desc';
    status?: 'draft' | 'published' | 'archived';
    tags?: string[];
    category?: string;
}
