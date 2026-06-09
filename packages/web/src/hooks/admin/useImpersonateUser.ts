import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n';
import { authService } from '@dosfilos/application';

/**
 * Super-admin "log in as user". On success the Firebase session is swapped to
 * the target user (via signInWithCustomToken inside authService) — the global
 * auth listener picks up the new user and the app re-renders as them — so we
 * just route to the user dashboard. The persistent <ImpersonationBanner/>
 * (driven by useImpersonation) handles the way back.
 */
export function useImpersonateUser() {
    const [isLoading, setIsLoading] = useState(false);
    const { t } = useTranslation('admin');
    const navigate = useNavigate();

    const impersonate = async (userId: string): Promise<boolean> => {
        setIsLoading(true);
        try {
            const data = await authService.impersonateUser(userId);
            toast.success(t('users.toasts.impersonateSuccess', { name: data.targetName ?? data.targetEmail ?? '' }));
            navigate('/dashboard');
            return true;
        } catch (err: any) {
            console.error('[useImpersonateUser]', err);
            toast.error(err?.message ?? t('users.toasts.impersonateError'));
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    return { impersonate, isLoading };
}
