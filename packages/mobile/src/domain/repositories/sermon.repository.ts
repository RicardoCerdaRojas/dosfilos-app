import { Sermon, SermonSummary } from '@/domain/models/sermon.model';

export interface SermonRepository {
    /** Resúmenes de sermones publicados del usuario autenticado (callable, App Check). */
    getPublishedSummaries(): Promise<SermonSummary[]>;
    /** Títulos de series por id (lectura Firestore directa, cachea offline). */
    getSeriesTitles(seriesIds: string[]): Promise<Record<string, string>>;
    /** Detalle completo (lectura Firestore directa — cae en caché offline del SDK nativo). */
    getSermonById(id: string): Promise<Sermon | null>;
}
