import { useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n';
import {
    adminUserService,
    type ResetUserPlanQuotaArgs,
    type ResetUserPlanQuotaResponse,
} from '@dosfilos/application';

/**
 * Calls the `resetUserPlanQuota` cloud function. Returns the applied quotas
 * on success (or `null` on failure) so the caller can surface a richer toast
 * ("Reset to 800 std / 40 prem / $0 exegesis") rather than a generic ack.
 */
export function useResetUserPlanQuota() {
    const [isLoading, setIsLoading] = useState(false);
    const { t } = useTranslation('admin');

    const resetQuota = async (args: ResetUserPlanQuotaArgs): Promise<ResetUserPlanQuotaResponse | null> => {
        setIsLoading(true);
        try {
            const data = await adminUserService.resetUserPlanQuota(args);
            if (data.success) {
                toast.success(t('users.toasts.resetQuotaSuccess', {
                    standard: data.appliedQuotas.standardPages,
                    premium: data.appliedQuotas.premiumPages,
                }));
                return data;
            }
            return null;
        } catch (err: any) {
            console.error('[useResetUserPlanQuota]', err);
            toast.error(err?.message ?? t('users.toasts.resetQuotaError'));
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    return { resetQuota, isLoading };
}
