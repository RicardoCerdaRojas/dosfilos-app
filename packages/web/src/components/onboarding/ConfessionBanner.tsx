import { Link, useLocation } from 'react-router-dom';
import { BookOpen, ChevronRight } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { useUserProfile } from '@/hooks/useUserProfile';

const HIDDEN_PATHS = [
    '/dashboard/settings',
    '/dashboard/admin',
    '/dashboard/onboarding',
];

/**
 * Persistent banner shown across the dashboard until the pastor declares
 * a confessional identity ([ADR-007 § Q2](docs/pastoral-fidelity/decisions/ADR-007-phase-0-policy-resolutions.md)).
 *
 * Non-blocking: the legacy sermon generator and the rest of the platform
 * keep working without a declaration. The Pastoral Fidelity flow
 * (`pastoral_fidelity_flow` feature flag) is the only surface that hard-
 * gates on `declaredConfession` — handled by `useRequiresConfession`.
 *
 * The banner hides on `/settings/*` (the user is already on the right page)
 * and on `/admin/*` (we don't want a banner over admin tooling). It also
 * stays loading-quiet — never appears while the profile is still
 * resolving, to avoid flashing on first paint.
 */
export function ConfessionBanner() {
    const { profile, loading } = useUserProfile();
    const { t } = useTranslation('dashboard');
    const location = useLocation();

    if (loading || !profile) return null;
    if (profile.declaredConfession) return null;
    if (HIDDEN_PATHS.some((p) => location.pathname.startsWith(p))) return null;

    return (
        <div className="mx-3 md:mx-4 mt-3 mb-1 rounded-lg border border-warning/30 bg-warning/10 p-3 flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-warning shrink-0" />
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">
                    {t('confession.banner.title')}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-2">
                    {t('confession.banner.description')}
                </p>
            </div>
            <Link
                to="/dashboard/settings/confession"
                className="inline-flex items-center gap-1 text-sm font-medium text-warning hover:text-warning/80 shrink-0 px-3 py-1.5 rounded-md hover:bg-warning/10 transition-colors"
            >
                {t('confession.banner.cta')}
                <ChevronRight className="h-4 w-4" />
            </Link>
        </div>
    );
}
