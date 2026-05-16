import type { LucideIcon } from 'lucide-react';
import {
    NotebookPen, PenLine, BookMarked, Heart, Compass,
    Search, ListChecks, MessageSquare, FileDown, Bookmark,
    Layers, Calendar, FileText, GraduationCap, Sparkles,
} from 'lucide-react';

/**
 * Onboarding intent catalog. Each intent maps to:
 *   - a downstream route (when the flow is wired)
 *   - an accent color token (drives icon tile + selected border)
 *   - a workflow storyboard (3-4 steps shown in the wizard + HelpCenter)
 *
 * `available: false` intents still capture the user's signal (persisted in
 * localStorage) so we know what to prioritize next — they just route to
 * /dashboard with a toast.
 */
export type OnboardingIntentId =
    | 'exegesis-paper'
    | 'devotional-content'
    | 'expository-series'
    | 'counseling-course'
    | 'explore';

export interface WorkflowStep {
    icon: LucideIcon;
    /** i18n key suffix; full key: `onboarding.intents.{intent}.workflow.{stepKey}.{title|description}` */
    stepKey: string;
}

export interface OnboardingIntent {
    id: OnboardingIntentId;
    icon: LucideIcon;
    available: boolean;
    /** Destination route when intent is available. */
    route?: string;
    accent: 'primary' | 'info' | 'success' | 'warning';
    /** 3-4 step storyboard shown to teach the user what the flow produces. */
    workflow: WorkflowStep[];
}

export const ONBOARDING_INTENTS: OnboardingIntent[] = [
    {
        id: 'exegesis-paper',
        icon: NotebookPen,
        available: true,
        route: '/dashboard/exegesis',
        accent: 'primary',
        workflow: [
            { icon: Search, stepKey: 'pickPassage' },
            { icon: ListChecks, stepKey: 'configureRubric' },
            { icon: MessageSquare, stepKey: 'studyWithTutors' },
            { icon: FileDown, stepKey: 'exportDocx' },
        ],
    },
    {
        id: 'devotional-content',
        icon: PenLine,
        available: true,
        route: '/dashboard/faculty?intent=devotional',
        accent: 'success',
        workflow: [
            { icon: Search, stepKey: 'pickTopic' },
            { icon: MessageSquare, stepKey: 'chatFaculty' },
            { icon: PenLine, stepKey: 'generateDevotional' },
            { icon: Bookmark, stepKey: 'saveResource' },
        ],
    },
    {
        id: 'expository-series',
        icon: BookMarked,
        available: false,
        accent: 'info',
        workflow: [
            { icon: BookMarked, stepKey: 'pickBook' },
            { icon: Layers, stepKey: 'dividePericopes' },
            { icon: Calendar, stepKey: 'weeklyStudy' },
            { icon: FileText, stepKey: 'sermonReady' },
        ],
    },
    {
        id: 'counseling-course',
        icon: Heart,
        available: false,
        accent: 'warning',
        workflow: [
            { icon: Heart, stepKey: 'defineTopic' },
            { icon: Layers, stepKey: 'generateSessions' },
            { icon: FileText, stepKey: 'createArtifacts' },
            { icon: Sparkles, stepKey: 'shareWithCouple' },
        ],
    },
    {
        id: 'explore',
        icon: Compass,
        available: true,
        route: '/dashboard',
        accent: 'info',
        workflow: [
            { icon: GraduationCap, stepKey: 'studies' },
            { icon: NotebookPen, stepKey: 'work' },
            { icon: Bookmark, stepKey: 'resources' },
        ],
    },
];

const STORAGE_KEY = 'onboarding_picked_intent';

export function persistIntent(userId: string, intent: OnboardingIntentId): void {
    if (!userId) return;
    localStorage.setItem(`${STORAGE_KEY}_${userId}`, intent);
}

export function readIntent(userId: string): OnboardingIntentId | null {
    if (!userId) return null;
    return (localStorage.getItem(`${STORAGE_KEY}_${userId}`) as OnboardingIntentId) || null;
}

/** Accent token map shared by wizard + HelpCenter so accent stays consistent. */
export const ACCENT_TONE: Record<OnboardingIntent['accent'], { iconBg: string; iconText: string; selectedBorder: string; selectedBg: string; line: string }> = {
    primary: {
        iconBg: 'bg-primary/10',
        iconText: 'text-primary',
        selectedBorder: 'border-primary',
        selectedBg: 'bg-primary/5',
        line: 'bg-primary/30',
    },
    info: {
        iconBg: 'bg-info-subtle',
        iconText: 'text-info',
        selectedBorder: 'border-info',
        selectedBg: 'bg-info-subtle/40',
        line: 'bg-info/30',
    },
    success: {
        iconBg: 'bg-success-subtle',
        iconText: 'text-success',
        selectedBorder: 'border-success',
        selectedBg: 'bg-success-subtle/40',
        line: 'bg-success/30',
    },
    warning: {
        iconBg: 'bg-warning-subtle',
        iconText: 'text-warning',
        selectedBorder: 'border-warning',
        selectedBg: 'bg-warning-subtle/40',
        line: 'bg-warning/30',
    },
};
