import { useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n';
import { adminUserService } from '@dosfilos/application';

/**
 * Mutates a user's feature-flags map. Mirrors the disable/enable hook
 * pattern: presenter-only, no Firebase SDK imports. Toasts on success
 * and surfaces the callable error message otherwise.
 */
export function useSetUserFeatureFlags() {
    const [isLoading, setIsLoading] = useState(false);
    const { t } = useTranslation('admin');

    const setFlags = async (
        userId: string,
        flags: Record<string, boolean>,
    ): Promise<boolean> => {
        setIsLoading(true);
        try {
            await adminUserService.setUserFeatureFlags({ userId, flags });
            toast.success(t('users.toasts.featureFlagsSuccess'));
            return true;
        } catch (error: any) {
            console.error('Error setting feature flags:', error);
            toast.error(error.message || t('users.toasts.featureFlagsError'));
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    return { setFlags, isLoading };
}
