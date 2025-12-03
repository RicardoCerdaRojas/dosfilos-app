import { SermonEntity } from '../entities/Sermon';

export interface IExportService {
    /**
     * Export a sermon to a PDF file
     * @param sermon The sermon entity to export
     */
    exportSermonToPdf(sermon: SermonEntity): Promise<void>;
}
