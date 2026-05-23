import { useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n';
import { adminConfessionService, type IngestReportItem } from '@dosfilos/application';

/**
 * Triggers the CORE Library ingest callable. Presenter-only: toasts on
 * success/error, returns the per-source report so the admin viewer can
 * surface which sources persisted content vs which are still pending.
 */
export function useIngestCoreLibrary() {
    const [isLoading, setIsLoading] = useState(false);
    const [lastReport, setLastReport] = useState<IngestReportItem[] | null>(null);
    const { t } = useTranslation('admin');

    const ingest = async (confessionIds?: string[]): Promise<IngestReportItem[] | null> => {
        setIsLoading(true);
        try {
            const { report } = await adminConfessionService.ingestCoreLibrary({ confessionIds });
            setLastReport(report);
            const ingested = report.filter((r) => r.status === 'ingested').length;
            const pending = report.filter((r) => r.status === 'pending-content').length;
            const reference = report.filter((r) => r.status === 'reference-only').length;
            toast.success(
                t('confessions.toasts.ingestSuccess', {
                    ingested,
                    pending,
                    reference,
                }),
            );
            return report;
        } catch (error: any) {
            console.error('Error ingesting CORE Library:', error);
            toast.error(error.message || t('confessions.toasts.ingestError'));
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    return { ingest, isLoading, lastReport };
}
