import { Loader2, LogOut, UserCog } from 'lucide-react';
import { useImpersonation } from '@/hooks/useImpersonation';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useTranslation } from '@/i18n';

/**
 * Persistent banner shown while a super admin is viewing the app as another
 * user. Rendered at the dashboard-layout level so it stays put across routes.
 * Clicking "exit" swaps the session back to the admin via stopImpersonating.
 */
export function ImpersonationBanner() {
    const { isImpersonating, impersonatorEmail, stop, isStopping } = useImpersonation();
    const { profile } = useUserProfile();
    const { t } = useTranslation('admin');

    if (!isImpersonating) return null;

    const viewingAs = profile?.displayName || profile?.email || '';

    return (
        <div
            role="status"
            className="flex items-center justify-center gap-3 bg-warning px-4 py-2 text-sm font-medium text-warning-foreground"
        >
            <UserCog className="h-4 w-4 shrink-0" />
            <span className="truncate">
                {t('users.impersonation.banner', { user: viewingAs })}
                {impersonatorEmail ? ` · ${impersonatorEmail}` : ''}
            </span>
            <button
                type="button"
                onClick={stop}
                disabled={isStopping}
                className="inline-flex shrink-0 items-center gap-1 rounded-md bg-warning-foreground/15 px-2.5 py-1 font-semibold transition hover:bg-warning-foreground/25 disabled:opacity-60"
            >
                {isStopping ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
                {t('users.impersonation.exit')}
            </button>
        </div>
    );
}
