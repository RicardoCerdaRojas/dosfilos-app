import { Sprout, Pause, Play, ChevronRight } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    PASTORAL_SEED_STEP_ORDER,
    type GuidedSermonSession,
    type PastoralSeedStepKey,
} from '@dosfilos/domain';

interface Props {
    session: GuidedSermonSession;
    onPause?: () => void;
    onResume?: () => void;
    onOpenWizard?: () => void;
}

/**
 * Phase 2.5 PR B (ADR-028) — Compact header for a chat session in
 * guided-sermon mode. Shows progress N/8 + the current step + a pause/
 * resume toggle. When the agent completes the seed (status: 'completed')
 * the header surfaces a CTA to open the wizard at homiletics.
 */
export function GuidedSermonHeader({ session, onPause, onResume, onOpenWizard }: Props) {
    const { t } = useTranslation('guidedSermon');
    const currentIdx = PASTORAL_SEED_STEP_ORDER.indexOf(session.currentStep);
    const isCompleted = session.status === 'completed';
    const isPaused = session.status === 'paused';

    return (
        <section className="border-b border-border bg-info-subtle/40 px-4 py-2">
            <div className="flex items-center gap-3">
                <Sprout className="h-4 w-4 text-success shrink-0" />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                        <span>{t('header.title')}</span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-muted-foreground truncate">{session.passage}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                        {PASTORAL_SEED_STEP_ORDER.map((key, i) => (
                            <StepDot key={key} step={key} index={i} currentIdx={currentIdx} completed={isCompleted} />
                        ))}
                        <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                            {isCompleted
                                ? t('header.completed')
                                : `${currentIdx + 1}/${PASTORAL_SEED_STEP_ORDER.length} · ${t(`steps.${session.currentStep}`)}`}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    {isCompleted ? (
                        <Button size="sm" onClick={onOpenWizard}>
                            {t('header.openWizard')} <ChevronRight className="h-4 w-4" />
                        </Button>
                    ) : isPaused ? (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={onResume}
                            title={t('header.resume')}
                            aria-label={t('header.resume')}
                        >
                            <Play className="h-3.5 w-3.5" />
                            <span className="ml-1 hidden sm:inline">{t('header.resume')}</span>
                        </Button>
                    ) : (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={onPause}
                            title={t('header.pause')}
                            aria-label={t('header.pause')}
                        >
                            <Pause className="h-3.5 w-3.5" />
                            <span className="ml-1 hidden sm:inline">{t('header.pause')}</span>
                        </Button>
                    )}
                </div>
            </div>
        </section>
    );
}

interface DotProps {
    step: PastoralSeedStepKey;
    index: number;
    currentIdx: number;
    completed: boolean;
}

function StepDot({ step, index, currentIdx, completed }: DotProps) {
    const isDone = completed || index < currentIdx;
    const isCurrent = !completed && index === currentIdx;
    const { t } = useTranslation('guidedSermon');
    return (
        <span
            className={cn(
                'h-1.5 rounded-full transition-all',
                isCurrent ? 'w-4 bg-info' : isDone ? 'w-1.5 bg-success' : 'w-1.5 bg-muted',
            )}
            title={t(`steps.${step}`)}
            aria-label={`${index + 1}. ${t(`steps.${step}`)}`}
        />
    );
}
