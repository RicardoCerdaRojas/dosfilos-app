import { AlertCircle, CheckCircle2, ChevronRight, FileQuestion } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n';
import {
    formatPassageReference,
    type ExegeticalStep,
    type SupportedLanguage,
} from '@dosfilos/domain';

export interface ComposeSectionPrecheckMissing {
    /** Verses that have a generated analysis sitting in awaiting-review (one click away). */
    awaitingReview: ReadonlyArray<ExegeticalStep>;
    /** Verses with no canonicalAnalysis yet (need analyze-then-accept). */
    noAnalysis: ReadonlyArray<ExegeticalStep>;
    /** Only meaningful when section='introduction'. True when conclusion is not yet accepted. */
    conclusionMissing: boolean;
}

interface ComposeSectionPrecheckDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    section: 'conclusion' | 'introduction';
    missing: ComposeSectionPrecheckMissing;
    language: SupportedLanguage;
}

/**
 * Pre-check modal for "Componer desde análisis" on conclusion /
 * introduction. Shown when the composer use case would throw
 * "paper has no accepted verse analyses" — surfaces the same
 * information in an actionable form (jump-to + accept on each
 * pending verse). Caller decides when to open by inspecting
 * paper.steps before dispatching the mutation.
 */
export function ComposeSectionPrecheckDialog({
    open,
    onOpenChange,
    section,
    missing,
    language,
}: ComposeSectionPrecheckDialogProps) {
    const { t } = useTranslation('exegesis');

    const handleJump = (stepId: string) => {
        const el = document.getElementById(`exegesis-step-${stepId}`);
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Brief highlight so user finds it after scroll.
        el.classList.add('ring-2', 'ring-emerald-400', 'ring-offset-2');
        window.setTimeout(() => {
            el.classList.remove('ring-2', 'ring-emerald-400', 'ring-offset-2');
        }, 1800);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="inline-flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-500" aria-hidden />
                        {t(`canonical.precheck.${section}.title`)}
                    </DialogTitle>
                    <DialogDescription>
                        {t(`canonical.precheck.${section}.subtitle`)}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-2">
                    {missing.conclusionMissing && (
                        <section className="rounded-md border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 p-3">
                            <p className="text-xs font-semibold text-amber-800 dark:text-amber-200 mb-1">
                                {t('canonical.precheck.conclusionMissingTitle')}
                            </p>
                            <p className="text-[11px] text-amber-700 dark:text-amber-300">
                                {t('canonical.precheck.conclusionMissingBody')}
                            </p>
                        </section>
                    )}

                    {missing.awaitingReview.length > 0 && (
                        <section>
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-2 inline-flex items-center gap-1.5">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                {t('canonical.precheck.awaitingReviewTitle', {
                                    count: missing.awaitingReview.length,
                                })}
                            </p>
                            <ul className="space-y-1">
                                {missing.awaitingReview.map(step => (
                                    <li key={step.id}>
                                        <button
                                            type="button"
                                            onClick={() => handleJump(step.id)}
                                            className="w-full inline-flex items-center justify-between gap-2 rounded-md border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/10 px-2.5 py-1.5 text-left text-xs text-slate-800 dark:text-slate-100 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                                        >
                                            <span className="truncate">
                                                {labelFor(step, language, t)}
                                            </span>
                                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-300 shrink-0">
                                                {t('canonical.precheck.acceptCta')}
                                                <ChevronRight className="h-3 w-3" />
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    {missing.noAnalysis.length > 0 && (
                        <section>
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-2 inline-flex items-center gap-1.5">
                                <FileQuestion className="h-3.5 w-3.5 text-slate-400" />
                                {t('canonical.precheck.noAnalysisTitle', {
                                    count: missing.noAnalysis.length,
                                })}
                            </p>
                            <ul className="space-y-1">
                                {missing.noAnalysis.map(step => (
                                    <li key={step.id}>
                                        <button
                                            type="button"
                                            onClick={() => handleJump(step.id)}
                                            className="w-full inline-flex items-center justify-between gap-2 rounded-md border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-left text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition-colors"
                                        >
                                            <span className="truncate">
                                                {labelFor(step, language, t)}
                                            </span>
                                            <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 shrink-0">
                                                {t('canonical.precheck.analyzeCta')}
                                                <ChevronRight className="h-3 w-3" />
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 italic leading-relaxed">
                        {t(`canonical.precheck.${section}.hint`)}
                    </p>
                </div>

                <div className="flex justify-end mt-2">
                    <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                        {t('canonical.precheck.close')}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function labelFor(
    step: ExegeticalStep,
    language: SupportedLanguage,
    t: (key: string) => string,
): string {
    if (step.kind === 'verse' && step.verseRef) {
        return formatPassageReference(step.verseRef, language);
    }
    return t(`detail.steps.kind.${step.kind}`);
}
