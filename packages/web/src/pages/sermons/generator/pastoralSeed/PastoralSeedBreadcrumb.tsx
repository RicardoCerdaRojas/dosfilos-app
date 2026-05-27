import { CheckCircle2, Circle, CircleDot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PastoralSeedStepKey } from '@dosfilos/domain';

export interface BreadcrumbStep {
    key: PastoralSeedStepKey;
    /** 1-indexed label shown in the chip. */
    index: number;
    title: string;
    completed: boolean;
}

interface Props {
    steps: BreadcrumbStep[];
    currentIndex: number;
    /** Click only allowed on previous + completed steps to encourage forward motion. */
    onJumpTo?: (key: PastoralSeedStepKey) => void;
}

/**
 * Linear visible breadcrumb for the six-step spine (ADR-002 decision:
 * lineal con breadcrumb). Surfaces per-step completion using the
 * domain evaluator. Skip-ahead is disallowed by design: the pastor
 * works each step before unlocking the next.
 */
export function PastoralSeedBreadcrumb({ steps, currentIndex, onJumpTo }: Props) {
    return (
        <ol className="flex flex-wrap items-center gap-2 text-xs">
            {steps.map((step, i) => {
                const isCurrent = i === currentIndex;
                const isPast = i < currentIndex;
                const interactive = (isPast || step.completed) && onJumpTo;
                const Icon = step.completed ? CheckCircle2 : isCurrent ? CircleDot : Circle;
                return (
                    <li key={step.key} className="flex items-center gap-2">
                        <button
                            type="button"
                            disabled={!interactive}
                            onClick={interactive ? () => onJumpTo!(step.key) : undefined}
                            className={cn(
                                'flex items-center gap-1.5 rounded-full border px-3 py-1 transition-colors',
                                isCurrent && 'border-primary bg-primary/10 text-primary font-semibold',
                                !isCurrent && step.completed && 'border-emerald-500/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400',
                                !isCurrent && !step.completed && 'border-muted bg-muted/30 text-muted-foreground',
                                interactive && 'hover:bg-primary/15 cursor-pointer',
                                !interactive && 'cursor-default',
                            )}
                        >
                            <Icon className="h-3.5 w-3.5" />
                            <span>{step.index}. {step.title}</span>
                        </button>
                        {i < steps.length - 1 && <span className="text-muted-foreground">›</span>}
                    </li>
                );
            })}
        </ol>
    );
}
