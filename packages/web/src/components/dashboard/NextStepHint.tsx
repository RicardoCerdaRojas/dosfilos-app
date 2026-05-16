import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { NextStepHint as NextStepHintData } from '@/hooks/dashboard/useNextStepHint';

interface Props {
    hint: NextStepHintData;
}

const TONE: Record<NextStepHintData['tone'], { wrap: string; iconBg: string; iconText: string; cta: string }> = {
    primary: {
        wrap: 'border-primary/30 bg-primary/5',
        iconBg: 'bg-primary/15',
        iconText: 'text-primary',
        cta: 'text-primary',
    },
    warning: {
        wrap: 'border-warning/30 bg-warning-subtle/40',
        iconBg: 'bg-warning/15',
        iconText: 'text-warning',
        cta: 'text-warning-subtle-foreground',
    },
    info: {
        wrap: 'border-info/30 bg-info-subtle/40',
        iconBg: 'bg-info/15',
        iconText: 'text-info',
        cta: 'text-info',
    },
    success: {
        wrap: 'border-success/30 bg-success-subtle/40',
        iconBg: 'bg-success/15',
        iconText: 'text-success',
        cta: 'text-success',
    },
};

/**
 * Compact contextual banner shown in the dashboard hero. Renders the highest-
 * priority "next step" produced by `useNextStepHint` — agenda urgency, an
 * in-progress paper/sermon, or a post-onboarding nudge. Returns nothing when
 * the hook reports null (then the hero falls back to the static context line).
 *
 * Visual: full-width-of-hero card, accent-tinted by `tone`, with icon tile +
 * 2-line copy + arrow CTA. Subtle fade-in via Framer Motion.
 */
export function NextStepHint({ hint }: Props) {
    const tone = TONE[hint.tone];
    const Icon = hint.icon;

    return (
        <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="mt-3"
        >
            <Link
                to={hint.href}
                className={`group flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-all hover:shadow-sm ${tone.wrap}`}
            >
                <div className={`shrink-0 w-9 h-9 rounded-md ${tone.iconBg} flex items-center justify-center`}>
                    <Icon className={`h-4 w-4 ${tone.iconText}`} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{hint.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{hint.subtitle}</p>
                </div>
                <div className={`shrink-0 inline-flex items-center gap-1 text-xs font-medium ${tone.cta} group-hover:gap-1.5 transition-all`}>
                    {hint.ctaLabel}
                    <ArrowRight className="h-3.5 w-3.5" />
                </div>
            </Link>
        </motion.div>
    );
}
