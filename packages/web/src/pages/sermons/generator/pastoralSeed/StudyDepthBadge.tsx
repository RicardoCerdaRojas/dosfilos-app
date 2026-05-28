import { useState } from 'react';
import { ChevronDown, ChevronRight, Gauge, Check } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { cn } from '@/lib/utils';
import {
    DIMENSION_ORDER,
    type CoverageState,
    type DimensionId,
    type StudyDepthAssessment,
} from '@dosfilos/domain';

interface Props {
    assessment: StudyDepthAssessment;
    /** Toggle a dimension's manual "covered" override (ADR-027). */
    onToggleOverride: (dimensionId: DimensionId, pastorMarkedComplete: boolean) => void;
}

/**
 * Phase 2.5 (ADR-025) — Study Companion coverage badge.
 *
 * Anti-gamification: shows ONLY qualitative coverage per dimension (bar +
 * state word), never a number/streak/leaderboard. The pastor may manually
 * mark a dimension covered when work happened outside the wizard.
 */
export function StudyDepthBadge({ assessment, onToggleOverride }: Props) {
    const { t } = useTranslation('studyDepth');
    const [open, setOpen] = useState(true);

    return (
        <section className="rounded-lg border border-border bg-card">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left"
                aria-expanded={open}
                title={open ? t('badge.hide') : t('badge.show')}
            >
                <Gauge className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground flex-1">{t('badge.title')}</span>
                {open ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
            </button>

            {open && (
                <div className="px-3 pb-3 space-y-2">
                    <p className="text-[11px] leading-snug text-muted-foreground">{t('badge.hint')}</p>
                    <ul className="space-y-1.5">
                        {DIMENSION_ORDER.map((id) => {
                            const dim = assessment.dimensions[id];
                            return (
                                <DimensionRow
                                    key={id}
                                    id={id}
                                    state={dim.state}
                                    score={dim.score}
                                    marked={dim.pastorMarkedComplete === true}
                                    onToggleOverride={onToggleOverride}
                                />
                            );
                        })}
                    </ul>
                </div>
            )}
        </section>
    );
}

const STATE_FILL: Record<CoverageState, string> = {
    untouched: 'bg-muted',
    started: 'bg-warning',
    covered: 'bg-info',
    deep: 'bg-success',
};

interface RowProps {
    id: DimensionId;
    state: CoverageState;
    score: number;
    marked: boolean;
    onToggleOverride: (dimensionId: DimensionId, pastorMarkedComplete: boolean) => void;
}

function DimensionRow({ id, state, score, marked, onToggleOverride }: RowProps) {
    const { t } = useTranslation('studyDepth');
    return (
        <li className="group">
            <div className="flex items-center gap-2">
                <span className="text-[11px] text-foreground/80 flex-1 truncate" title={t(`dimensions.${id}`)}>
                    {t(`dimensions.${id}`)}
                </span>
                <span className="text-[10px] text-muted-foreground tabular-nums">{t(`states.${state}`)}</span>
                <button
                    type="button"
                    onClick={() => onToggleOverride(id, !marked)}
                    className={cn(
                        'flex h-4 w-4 items-center justify-center rounded border transition-colors',
                        marked
                            ? 'border-success bg-success text-success-foreground'
                            : 'border-border text-muted-foreground opacity-0 group-hover:opacity-100',
                    )}
                    title={marked ? t('override.unmark') : t('override.mark')}
                    aria-label={marked ? t('override.ariaUnmark') : t('override.ariaMark')}
                >
                    <Check className="h-3 w-3" />
                </button>
            </div>
            <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                    className={cn('h-full rounded-full transition-all', STATE_FILL[state])}
                    style={{ width: `${Math.max(state === 'untouched' ? 0 : 6, score)}%` }}
                />
            </div>
        </li>
    );
}
