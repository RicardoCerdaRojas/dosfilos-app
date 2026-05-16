import type { LucideIcon } from 'lucide-react';
import { NotebookPen, PenLine, BookMarked, Heart, Compass } from 'lucide-react';

/**
 * Onboarding intent catalog. Each intent maps to a downstream surface so the
 * wizard can route the user straight into a pre-shaped flow instead of dumping
 * them on a generic dashboard.
 *
 * `available` distinguishes flows that are wired end-to-end today from flows
 * that need backend work (sermon-series pipeline, course builder). Unavailable
 * intents still capture the user's signal (stored in localStorage) so we know
 * what to prioritize next — they just route to /dashboard with a toast.
 */
export type OnboardingIntentId =
    | 'exegesis-paper'
    | 'devotional-content'
    | 'expository-series'
    | 'counseling-course'
    | 'explore';

export interface OnboardingIntent {
    id: OnboardingIntentId;
    icon: LucideIcon;
    /** i18n key suffix; full keys live under `onboarding.intents.{id}.{title|description|cta}`. */
    available: boolean;
    /** Destination route when intent is available. Used to navigate post-completion. */
    route?: string;
    /** Accent color token used by the card (drives the icon + selection border). */
    accent: 'primary' | 'info' | 'success' | 'warning';
}

export const ONBOARDING_INTENTS: OnboardingIntent[] = [
    {
        id: 'exegesis-paper',
        icon: NotebookPen,
        available: true,
        route: '/dashboard/exegesis',
        accent: 'primary',
    },
    {
        id: 'devotional-content',
        icon: PenLine,
        available: true,
        route: '/dashboard/faculty?intent=devotional',
        accent: 'success',
    },
    {
        id: 'expository-series',
        icon: BookMarked,
        available: false,
        accent: 'info',
    },
    {
        id: 'counseling-course',
        icon: Heart,
        available: false,
        accent: 'warning',
    },
    {
        id: 'explore',
        icon: Compass,
        available: true,
        route: '/dashboard',
        accent: 'info',
    },
];

const STORAGE_KEY = 'onboarding_picked_intent';

/**
 * Persists the user's wizard selection so the dashboard can render contextual
 * follow-ups ("Continúa donde quedaste" etc) and we can analyze intent
 * distribution to prioritize roadmap.
 */
export function persistIntent(userId: string, intent: OnboardingIntentId): void {
    if (!userId) return;
    localStorage.setItem(`${STORAGE_KEY}_${userId}`, intent);
}

export function readIntent(userId: string): OnboardingIntentId | null {
    if (!userId) return null;
    return (localStorage.getItem(`${STORAGE_KEY}_${userId}`) as OnboardingIntentId) || null;
}
