import { IExportService } from '@dosfilos/domain';
import { PdfExportService } from '@dosfilos/infrastructure';

export class ExportService {
    private static instance: ExportService;
    private exportService: IExportService;

    private constructor() {
        this.exportService = new PdfExportService();
    }

    public static getInstance(): ExportService {
        if (!ExportService.instance) {
            ExportService.instance = new ExportService();
        }
        return ExportService.instance;
    }

    public getService(): IExportService {
        return this.exportService;
    }
}

export const exportService = ExportService.getInstance().getService();
