import { useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n';
import { adminUserService, type ExtendTrialArgs } from '@dosfilos/application';

export function useExtendUserTrialAdmin() {
    const [isLoading, setIsLoading] = useState(false);
    const { t } = useTranslation('admin');

    const extendTrial = async (args: ExtendTrialArgs): Promise<boolean> => {
        setIsLoading(true);
        try {
            await adminUserService.extendUserTrial(args);
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
