import { useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n';
import { adminUserService, type GrantUserCreditsArgs } from '@dosfilos/application';

export function useGrantUserCredits() {
    const [isLoading, setIsLoading] = useState(false);
    const { t } = useTranslation('admin');

    const grant = async (args: GrantUserCreditsArgs): Promise<boolean> => {
        setIsLoading(true);
        try {
            await adminUserService.grantUserCredits(args);
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
