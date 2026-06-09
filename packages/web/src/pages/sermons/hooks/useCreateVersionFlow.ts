import { useState } from 'react';
import { toast } from 'sonner';
import { sermonService } from '@dosfilos/application';
import { useTranslation } from '@/i18n';

interface UseCreateVersionFlowResult {
    /** Sermon id being versioned (drives the dialog open state). */
    sermonToVersion: string | null;
    setSermonToVersion: (id: string | null) => void;
    /** True while the version is being created. */
    creating: boolean;
    /** Creates the version with an optional occasion label, then refetches. */
    confirmCreateVersion: (label?: string) => Promise<void>;
}

/**
 * Wraps the "create a new version of a sermon" flow used by the sermons list.
 * Centralises toast feedback and keeps UI components off the data layer.
 */
export function useCreateVersionFlow(onSuccess: () => void | Promise<void>): UseCreateVersionFlowResult {
    const { t } = useTranslation('sermons');
    const [sermonToVersion, setSermonToVersion] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);

    const confirmCreateVersion = async (label?: string) => {
        if (!sermonToVersion) return;
        setCreating(true);
        try {
            await sermonService.createVersion(sermonToVersion, label);
            toast.success(t('versions.createSuccess'));
            setSermonToVersion(null);
            await onSuccess();
        } catch (err: any) {
            console.error('[useCreateVersionFlow] error:', err);
            toast.error(err?.message ?? t('versions.createError'));
        } finally {
            setCreating(false);
        }
    };

    return { sermonToVersion, setSermonToVersion, creating, confirmCreateVersion };
}
