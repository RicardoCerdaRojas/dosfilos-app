import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { authService } from '@dosfilos/application';
import { useFirebase } from '@/context/firebase-context';
import { useTranslation } from '@/i18n';

interface ImpersonationState {
    /** True while the current session was minted by impersonateUser. */
    isImpersonating: boolean;
    /** Email of the admin who started the impersonation (for the banner). */
    impersonatorEmail: string | null;
    /** Returns to the original admin session. */
    stop: () => Promise<void>;
    /** True while the return round-trip is in flight. */
    isStopping: boolean;
}

/**
 * Reads the `impersonatorUid` / `impersonatorEmail` claims off the current
 * session's ID token. impersonateUser bakes them in via createCustomToken, and
 * they survive token refresh for the session, so the banner stays up until the
 * admin clicks "exit" (which swaps the session back).
 */
export function useImpersonation(): ImpersonationState {
    const { user } = useFirebase();
    const navigate = useNavigate();
    const { t } = useTranslation('admin');
    const [impersonatorUid, setImpersonatorUid] = useState<string | null>(null);
    const [impersonatorEmail, setImpersonatorEmail] = useState<string | null>(null);
    const [isStopping, setIsStopping] = useState(false);

    useEffect(() => {
        let cancelled = false;
        if (!user) {
            setImpersonatorUid(null);
            setImpersonatorEmail(null);
            return;
        }
        user.getIdTokenResult()
            .then((res) => {
                if (cancelled) return;
                setImpersonatorUid((res.claims.impersonatorUid as string) ?? null);
                setImpersonatorEmail((res.claims.impersonatorEmail as string) ?? null);
            })
            .catch(() => {
                if (!cancelled) { setImpersonatorUid(null); setImpersonatorEmail(null); }
            });
        return () => { cancelled = true; };
    }, [user]);

    const stop = useCallback(async () => {
        setIsStopping(true);
        try {
            await authService.stopImpersonating();
            toast.success(t('users.toasts.stopImpersonateSuccess'));
            navigate('/dashboard/admin/users');
        } catch (err: any) {
            console.error('[useImpersonation] stop failed', err);
            toast.error(err?.message ?? t('users.toasts.stopImpersonateError'));
        } finally {
            setIsStopping(false);
        }
    }, [navigate, t]);

    return { isImpersonating: !!impersonatorUid, impersonatorEmail, stop, isStopping };
}
