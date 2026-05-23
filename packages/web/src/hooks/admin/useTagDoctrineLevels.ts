import { useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n';
import {
    adminConfessionService,
    type TagDoctrineLevelsArgs,
    type TagDoctrineLevelsReportItem,
} from '@dosfilos/application';

/**
 * Triggers the LLM-driven `doctrineLevel` tagging pass. Long-running
 * (≤9 min server timeout); the toast confirms how many sections were
 * tagged vs skipped vs failed so the admin knows whether to re-run.
 */
export function useTagDoctrineLevels() {
    const [isLoading, setIsLoading] = useState(false);
    const [lastReport, setLastReport] = useState<TagDoctrineLevelsReportItem[] | null>(null);
    const { t } = useTranslation('admin');

    const tag = async (args: TagDoctrineLevelsArgs = {}): Promise<TagDoctrineLevelsReportItem[] | null> => {
        setIsLoading(true);
        try {
            const { report } = await adminConfessionService.tagDoctrineLevels(args);
            setLastReport(report);
            const totals = report.reduce(
                (acc, r) => ({
                    tagged: acc.tagged + r.tagged,
                    skipped: acc.skipped + r.skipped,
                    failed: acc.failed + r.failed,
                }),
                { tagged: 0, skipped: 0, failed: 0 },
            );
            toast.success(t('confessions.toasts.tagSuccess', totals));
            return report;
        } catch (error: any) {
            console.error('Error tagging doctrine levels:', error);
            toast.error(error.message || t('confessions.toasts.tagError'));
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    return { tag, isLoading, lastReport };
}
