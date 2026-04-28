import { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n';

interface ExtendTrialArgs {
    userId: string;
    days: number;
    reason: string;
}

export function useExtendUserTrialAdmin() {
    const [isLoading, setIsLoading] = useState(false);
    const { t } = useTranslation('admin');

    const extendTrial = async (args: ExtendTrialArgs): Promise<boolean> => {
        setIsLoading(true);
        try {
            const fn = httpsCallable(getFunctions(), 'extendUserTrialAdmin');
            await fn(args);
            toast.success(t('users.toasts.extendTrialSuccess'));
            return true;
        } catch (err: any) {
            console.error('[useExtendUserTrialAdmin]', err);
            toast.error(err?.message ?? t('users.toasts.extendTrialError'));
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    return { extendTrial, isLoading };
}
