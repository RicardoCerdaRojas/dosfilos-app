import { useMemo } from 'react';
import {
    Calendar, NotebookPen, FileText, Sparkles, BookOpen, type LucideIcon,
} from 'lucide-react';
import { useFirebase } from '@/context/firebase-context';
import { useTranslation } from '@/i18n';
import { useSermons } from '@/hooks/use-sermons';
import { useExegesisPapers } from '@/hooks/exegesis/useExegesisPapers';
import { readIntent, ONBOARDING_INTENTS } from '@/components/onboarding/onboardingIntents';
import type { SermonEntity, ExegeticalPaper } from '@dosfilos/domain';

export type NextStepKind = 'agendaUrgent' | 'paperInProgress' | 'sermonInProgress' | 'intentNudge';

export interface NextStepHint {
    kind: NextStepKind;
    /** Pre-translated short label ("Tienes un sermón este domingo"). */
    title: string;
    /** Pre-translated body line ("Faltan 2 días · Romanos 8:28"). */
    subtitle: string;
    /** Primary action target. */
    href: string;
    /** Action label ("Abrir sermón"). */
    ctaLabel: string;
    icon: LucideIcon;
    tone: 'primary' | 'warning' | 'info' | 'success';
}

const URGENT_WINDOW_DAYS = 3;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface HintInput {
    sermons: SermonEntity[];
    papers: ExegeticalPaper[];
    pickedIntent: string | null;
    t: (key: string, params?: Record<string, unknown>) => string;
}

/**
 * Priority chain. First match wins:
 *   1. Urgent agenda  — sermon scheduled within next URGENT_WINDOW_DAYS days
 *   2. Paper resume   — most recently updated exegesis paper not yet assembled
 *   3. Sermon resume  — most recently updated draft/working sermon (no schedule)
 *   4. Intent nudge   — user picked an intent in onboarding but hasn't produced
 *                       anything in that domain yet
 *   5. null           — let the existing context line render
 *
 * Pure function so it stays testable independent of React.
 */
function computeHint(input: HintInput): NextStepHint | null {
    const { sermons, papers, pickedIntent, t } = input;
    const now = Date.now();

    // 1. Urgent agenda
    const urgentSermons = sermons
        .filter((s) => {
            if (!s.scheduledDate) return false;
            const ts = new Date(s.scheduledDate).getTime();
            const days = (ts - now) / MS_PER_DAY;
            return days >= -0.5 && days <= URGENT_WINDOW_DAYS;
        })
        .sort((a, b) => new Date(a.scheduledDate!).getTime() - new Date(b.scheduledDate!).getTime());

    if (urgentSermons.length > 0) {
        const sermon = urgentSermons[0]!;
        const date = new Date(sermon.scheduledDate!);
        const daysFromNow = Math.max(0, Math.round((date.getTime() - now) / MS_PER_DAY));
        const dayLabel = date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });
        return {
            kind: 'agendaUrgent',
            title: t('nextStep.agendaUrgent.title', { title: sermon.title }),
            subtitle: t('nextStep.agendaUrgent.subtitle', {
                day: dayLabel,
                count: daysFromNow,
            }),
            href: `/dashboard/sermons/${sermon.id}`,
            ctaLabel: t('nextStep.agendaUrgent.cta'),
            icon: Calendar,
            tone: daysFromNow <= 1 ? 'warning' : 'primary',
        };
    }

    // 2. Paper in progress
    const inProgressPapers = papers
        .filter((p) => !p.archivedAt && p.phase !== 'assembled' && p.phase !== 'archived')
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    if (inProgressPapers.length > 0) {
        const paper = inProgressPapers[0]!;
        return {
            kind: 'paperInProgress',
            title: t('nextStep.paperInProgress.title', { title: paper.title || t('nextStep.paperInProgress.untitled') }),
            subtitle: t('nextStep.paperInProgress.subtitle', { phase: t(`exegesis.phase.${paper.phase}`) }),
            href: `/dashboard/exegesis/${paper.id}`,
            ctaLabel: t('nextStep.paperInProgress.cta'),
            icon: NotebookPen,
            tone: 'primary',
        };
    }

    // 3. Sermon resume
    const inProgressSermons = sermons
        .filter((s) => !s.scheduledDate && (s.status === 'draft' || s.status === 'working'))
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    if (inProgressSermons.length > 0) {
        const sermon = inProgressSermons[0]!;
        return {
            kind: 'sermonInProgress',
            title: t('nextStep.sermonInProgress.title', { title: sermon.title }),
            subtitle: t('nextStep.sermonInProgress.subtitle'),
            href: `/dashboard/sermons/${sermon.id}`,
            ctaLabel: t('nextStep.sermonInProgress.cta'),
            icon: FileText,
            tone: 'info',
        };
    }

    // 4. Intent nudge — user picked an intent but no active artifact in that domain
    if (pickedIntent && pickedIntent !== 'explore') {
        const intent = ONBOARDING_INTENTS.find((i) => i.id === pickedIntent);
        if (intent?.available && intent.route) {
            return {
                kind: 'intentNudge',
                title: t(`nextStep.intentNudge.${pickedIntent}.title`),
                subtitle: t('nextStep.intentNudge.subtitle'),
                href: intent.route,
                ctaLabel: t(`nextStep.intentNudge.${pickedIntent}.cta`),
                icon: intent.id === 'exegesis-paper' ? NotebookPen : intent.id === 'devotional-content' ? Sparkles : BookOpen,
                tone: 'success',
            };
        }
    }

    return null;
}

export function useNextStepHint(): NextStepHint | null {
    const { user } = useFirebase();
    const { sermons } = useSermons();
    const { papers } = useExegesisPapers();
    const { t } = useTranslation('dashboard');
    const pickedIntent = user?.uid ? readIntent(user.uid) : null;

    return useMemo(
        () => computeHint({ sermons, papers: papers ?? [], pickedIntent, t }),
        [sermons, papers, pickedIntent, t],
    );
}
