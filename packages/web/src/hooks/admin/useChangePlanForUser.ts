import { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n';

interface ChangePlanArgs {
    userId: string;
    newPlanId: string;
    billing?: 'monthly' | 'yearly';
}

interface ChangePlanResponse {
    success: boolean;
    fromPlan: string;
    toPlan: string;
    billing: 'monthly' | 'yearly';
    cancelAtPeriodEnd: boolean;
}

export function useChangePlanForUser() {
    const [isLoading, setIsLoading] = useState(false);
    const { t } = useTranslation('admin');

    const changePlan = async (args: ChangePlanArgs): Promise<boolean> => {
        setIsLoading(true);
        try {
            const fn = httpsCallable<ChangePlanArgs, ChangePlanResponse>(
                getFunctions(),
                'changePlanForUser',
            );
            const { data } = await fn(args);
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
