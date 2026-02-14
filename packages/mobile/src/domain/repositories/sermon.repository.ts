import { Sermon } from '../models/sermon.model';

export interface SermonRepository {
    getSermons(limit?: number, offset?: number): Promise<Sermon[]>;
    getSermonById(id: string): Promise<Sermon | null>;
    getLatestSermon(): Promise<Sermon | null>;
}
