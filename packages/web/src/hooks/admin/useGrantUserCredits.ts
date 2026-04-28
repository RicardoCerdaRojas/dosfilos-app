import { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n';

interface GrantCreditsArgs {
    userId: string;
    standardPages?: number;
    premiumPages?: number;
    reason: string;
}

export function useGrantUserCredits() {
    const [isLoading, setIsLoading] = useState(false);
    const { t } = useTranslation('admin');

    const grant = async (args: GrantCreditsArgs): Promise<boolean> => {
        setIsLoading(true);
        try {
            const fn = httpsCallable(getFunctions(), 'grantUserCredits');
            await fn(args);
            toast.success(t('users.toasts.grantSuccess'));
            return true;
        } catch (err: any) {
            console.error('[useGrantUserCredits]', err);
            toast.error(err?.message ?? t('users.toasts.grantError'));
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    return { grant, isLoading };
}
