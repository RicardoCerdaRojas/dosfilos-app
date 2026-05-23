import { useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n';
import {
    adminConfessionService,
    type UpdateSectionDoctrineLevelArgs,
} from '@dosfilos/application';

/**
 * Persists Ricardo's review overrides (or ad-hoc reclassifications) for
 * a single section's `doctrineLevel` / `reviewStatus`. Toasts on
 * success/error; callers pass a refresh callback if they need the row
 * to flip in the UI.
 */
export function useUpdateSectionDoctrineLevel() {
    const [isLoading, setIsLoading] = useState(false);
    const { t } = useTranslation('admin');

    const update = async (args: UpdateSectionDoctrineLevelArgs): Promise<boolean> => {
        setIsLoading(true);
        try {
            await adminConfessionService.updateSectionDoctrineLevel(args);
            toast.success(t('confessions.toasts.reviewSuccess'));
            return true;
        } catch (error: any) {
            console.error('Error updating doctrine level:', error);
            toast.error(error.message || t('confessions.toasts.reviewError'));
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    return { update, isLoading };
}
