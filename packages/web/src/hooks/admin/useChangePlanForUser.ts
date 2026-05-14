import { useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n';
import { adminUserService, type ChangePlanForUserArgs } from '@dosfilos/application';

export function useChangePlanForUser() {
    const [isLoading, setIsLoading] = useState(false);
    const { t } = useTranslation('admin');

    const changePlan = async (args: ChangePlanForUserArgs): Promise<boolean> => {
        setIsLoading(true);
        try {
            const data = await adminUserService.changePlanForUser(args);
            if (data.success) {
                toast.success(t('users.toasts.changePlanSuccess'));
                return true;
            }
            return false;
        } catch (err: any) {
            console.error('[useChangePlanForUser]', err);
            toast.error(err?.message ?? t('users.toasts.changePlanError'));
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    return { changePlan, isLoading };
}
