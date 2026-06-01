import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ShieldAlert, Loader2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FIDELITY_OVERRIDE_MIN_CHARS, type FidelityReport } from '@dosfilos/domain';
import { FidelityOverrideForm } from './FidelityOverrideForm';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** The fresh report whose gateStatus drives the confrontation. */
    report: FidelityReport | null;
    /** Publish in progress (covers both the override write + publish). */
    publishing: boolean;
    /** Called with the justification when the pastor clears a soft-block. */
    onConfirmOverride: (reason: string) => void;
    /** Optional — close the modal and let the pastor revisit markers. */
    onReviewMarkers?: () => void;
}

/**
 * Phase 3 PR 2 (ADR-029 §Q3/Q5) — pre-publish confrontation modal.
 *
 *  - `hard-block` (>20% unrelated|contradicts): no override path. The pastor
 *    can only close + fix the citations (P3 confrontation is non-negotiable).
 *  - `soft-block` (>10% partial): override path with a justification of at
 *    least `FIDELITY_OVERRIDE_MIN_CHARS` chars, persisted as audit.
 *
 * A `pass` report never opens this modal — the orchestration publishes
 * directly — so the component renders nothing for it.
 */
export function PrePublishFidelityModal({
    open,
    onOpenChange,
    report,
    publishing,
    onConfirmOverride,
    onReviewMarkers,
}: Props) {
    const { t } = useTranslation('sermonDetail');
    const [reason, setReason] = useState('');

    if (!report || report.gateStatus === 'pass') return null;

    const isHard = report.gateStatus === 'hard-block';
    const summary = report.summary;
    const canOverride = reason.trim().length >= FIDELITY_OVERRIDE_MIN_CHARS;

    const handleReview = () => {
        onOpenChange(false);
        onReviewMarkers?.();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {isHard ? (
                            <ShieldAlert className="h-5 w-5 text-destructive" />
                        ) : (
                            <AlertTriangle className="h-5 w-5 text-warning" />
                        )}
                        {isHard ? t('fidelityGate.hardTitle') : t('fidelityGate.softTitle')}
                    </DialogTitle>
                    <DialogDescription>
                        {isHard
                            ? t('fidelityGate.hardDescription')
                            : t('fidelityGate.softDescription')}
                    </DialogDescription>
                </DialogHeader>

                {summary && (
                    <div
                        className={`rounded-md border px-3 py-2 text-xs ${
                            isHard
                                ? 'border-destructive/30 bg-destructive/10 text-destructive'
                                : 'border-warning/30 bg-warning-subtle text-warning-subtle-foreground'
                        }`}
                    >
                        {t('fidelityGate.summary', {
                            unrelated: Math.round(summary.unrelatedRatio * 100),
                            partial: Math.round(summary.partialRatio * 100),
                            total: summary.totalMarkers,
                        })}
                    </div>
                )}

                {!isHard && (
                    <FidelityOverrideForm
                        value={reason}
                        onChange={setReason}
                        minChars={FIDELITY_OVERRIDE_MIN_CHARS}
                        disabled={publishing}
                    />
                )}

                <DialogFooter className="gap-2 sm:gap-2">
                    <Button
                        variant="outline"
                        onClick={handleReview}
                        disabled={publishing}
                    >
                        {isHard ? t('fidelityGate.reviewMarkers') : t('fidelityGate.cancel')}
                    </Button>
                    {!isHard && (
                        <Button
                            onClick={() => onConfirmOverride(reason.trim())}
                            disabled={!canOverride || publishing}
                        >
                            {publishing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {t('fidelityGate.publishing')}
                                </>
                            ) : (
                                t('fidelityGate.publishAnyway')
                            )}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
