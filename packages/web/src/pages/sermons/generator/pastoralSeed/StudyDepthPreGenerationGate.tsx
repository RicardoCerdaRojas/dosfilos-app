import { useMemo, useState } from 'react';
import { AlertTriangle, Sparkles, ChevronRight, Wand2, Loader2 } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    buildStudyDepthSnapshot,
    DIMENSION_ORDER,
    STUDY_DEPTH_OVERRIDE_MIN_CHARS,
    type CoverageState,
    type DimensionId,
    type StudyDepthAssessment,
    type StudyDepthSnapshot,
} from '@dosfilos/domain';

interface Props {
    open: boolean;
    assessment: StudyDepthAssessment;
    expertMode: boolean;
    onProceed: (snapshot: StudyDepthSnapshot) => Promise<void> | void;
    onCancel: () => void;
}

/**
 * Phase 2.5 PR C (ADR-027) — Pre-generation gate.
 *
 * Confronts the pastor with their study coverage before turning the seed
 * into a sermon. Honors P3 (manifesto): confrontation is obligatory on red
 * dims; expert mode SOFTENS ceremony but never silences the confrontation.
 *
 * Outputs an immutable `StudyDepthSnapshot` to the caller, who is
 * responsible for embedding it into the `Sermon` doc at generation time.
 */
export function StudyDepthPreGenerationGate({ open, assessment, expertMode, onProceed, onCancel }: Props) {
    const { t } = useTranslation('studyDepth');
    const [justification, setJustification] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [askingJustification, setAskingJustification] = useState(false);

    const hasWeakDims = assessment.weakDimensions.length > 0;
    const justificationLen = justification.trim().length;
    const justificationOk = justificationLen >= STUDY_DEPTH_OVERRIDE_MIN_CHARS;

    const sortedDims = useMemo(
        () => [...DIMENSION_ORDER].sort((a, b) => assessment.dimensions[a].score - assessment.dimensions[b].score),
        [assessment],
    );

    const handleProceedDirect = async () => {
        if (submitting) return;
        setSubmitting(true);
        try {
            const snapshot = buildStudyDepthSnapshot(assessment, {
                bypassedConfrontation: false,
                expertMode,
            });
            await onProceed(snapshot);
        } finally {
            setSubmitting(false);
        }
    };

    const handleConfirmOverride = async () => {
        if (submitting || !justificationOk) return;
        setSubmitting(true);
        try {
            const snapshot = buildStudyDepthSnapshot(assessment, {
                bypassedConfrontation: true,
                justification: justification.trim(),
                expertMode,
            });
            await onProceed(snapshot);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-info" />
                        <DialogTitle>{t('gate.title')}</DialogTitle>
                        {expertMode && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-info px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-info-foreground">
                                <Wand2 className="h-3 w-3" /> {t('gate.expertBadge')}
                            </span>
                        )}
                    </div>
                </DialogHeader>

                <p className="text-sm text-muted-foreground">{t('gate.intro')}</p>

                <ul className="space-y-1.5 my-2">
                    {sortedDims.map((id) => (
                        <DimRow key={id} id={id} assessment={assessment} />
                    ))}
                </ul>

                {hasWeakDims && !askingJustification && (
                    <div className="rounded-md border border-warning/30 bg-warning-subtle p-3">
                        <p className="flex items-center gap-1.5 text-xs font-semibold text-warning-subtle-foreground">
                            <AlertTriangle className="h-3.5 w-3.5" /> {t('gate.weakDimsTitle')}
                        </p>
                        <p className="mt-1 text-xs text-warning-subtle-foreground">{t('gate.weakDimsHint')}</p>
                        <ul className="mt-2 space-y-1 text-xs text-warning-subtle-foreground">
                            {assessment.weakDimensions.slice(0, 3).map((id) => (
                                <li key={id} className="flex items-start gap-1.5">
                                    <ChevronRight className="h-3 w-3 mt-0.5 shrink-0" />
                                    <span>
                                        <span className="font-medium">{t(`dimensions.${id}`)}:</span>{' '}
                                        {t(`gate.promptFor.${id}`)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {askingJustification && (
                    <div className="space-y-2">
                        <label htmlFor="study-depth-justification" className="text-xs font-medium text-foreground">
                            {t('gate.justificationLabel')}
                        </label>
                        <Textarea
                            id="study-depth-justification"
                            value={justification}
                            onChange={(e) => setJustification(e.target.value)}
                            placeholder={t('gate.justificationPlaceholder')}
                            rows={4}
                            autoFocus
                        />
                        <p className={cn('text-[11px]', justificationOk ? 'text-success' : 'text-muted-foreground')}>
                            {t('gate.justificationCounter', { current: justificationLen, min: STUDY_DEPTH_OVERRIDE_MIN_CHARS })}
                        </p>
                    </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                    <Button variant="ghost" size="sm" onClick={onCancel} disabled={submitting}>
                        {t('gate.backToStudy')}
                    </Button>
                    {!hasWeakDims && (
                        <Button size="sm" onClick={handleProceedDirect} disabled={submitting}>
                            {submitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" /> {t('gate.generating')}
                                </>
                            ) : (
                                t('gate.proceedConfident')
                            )}
                        </Button>
                    )}
                    {hasWeakDims && !askingJustification && (
                        <Button size="sm" variant="outline" onClick={() => setAskingJustification(true)} disabled={submitting}>
                            {t('gate.overrideStart')}
                        </Button>
                    )}
                    {hasWeakDims && askingJustification && (
                        <Button size="sm" onClick={handleConfirmOverride} disabled={!justificationOk || submitting}>
                            {submitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" /> {t('gate.generating')}
                                </>
                            ) : (
                                t('gate.overrideConfirm')
                            )}
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

const STATE_FILL: Record<CoverageState, string> = {
    untouched: 'bg-muted',
    started: 'bg-warning',
    covered: 'bg-info',
    deep: 'bg-success',
};

function DimRow({ id, assessment }: { id: DimensionId; assessment: StudyDepthAssessment }) {
    const { t } = useTranslation('studyDepth');
    const dim = assessment.dimensions[id];
    return (
        <li className="flex items-center gap-2 text-xs">
            <span className="w-44 truncate text-foreground/90" title={t(`dimensions.${id}`)}>
                {t(`dimensions.${id}`)}
            </span>
            <span className="flex-1 h-1.5 overflow-hidden rounded-full bg-muted">
                <span
                    className={cn('h-full rounded-full block', STATE_FILL[dim.state])}
                    style={{ width: `${Math.max(dim.state === 'untouched' ? 0 : 6, dim.score)}%` }}
                />
            </span>
            <span className="w-16 text-[10px] text-muted-foreground text-right">
                {t(`states.${dim.state}`)}
            </span>
        </li>
    );
}
