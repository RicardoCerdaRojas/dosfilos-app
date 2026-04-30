import { FileCheck2, Loader2 } from 'lucide-react';
import { useTranslation } from '@/i18n';
import type { ExegeticalPaper } from '@dosfilos/domain';

/**
 * Rubric sub-step (Phase 2E placeholder shell).
 *
 * What lands here in 2E:
 *   - Upload rubric (PDF / EPUB / pasted text) → `IPaperRubricExtractor`
 *     produces structured `PaperRubric` → student reviews + edits.
 *   - Default rubric option for students who don't have a per-paper
 *     rubric from their seminary.
 *   - Editable structured form: requirements (per SourceType, with
 *     min/max + justification) + structural expectations (per step).
 *
 * For now: shows the system default rubric the create flow attached.
 */
interface RubricSubStepProps {
    paper: ExegeticalPaper;
}

export function RubricSubStep({ paper }: RubricSubStepProps) {
    const { t } = useTranslation('exegesis');
    const rubric = paper.rubric;

    return (
        <div className="space-y-4">
            <header className="flex items-start gap-3">
                <FileCheck2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                <div>
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                        {t('paperSetup.subSteps.rubric.heading')}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        {t('paperSetup.subSteps.rubric.description')}
                    </p>
                </div>
            </header>

            {!rubric && (
                <div className="text-sm text-slate-500 dark:text-slate-400 inline-flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {t('paperSetup.subSteps.rubric.loading')}
                </div>
            )}

            {rubric && (
                <div className="rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50 p-4 space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            {t(`paperSetup.subSteps.rubric.provenance.${rubric.provenance}`)}
                        </span>
                    </div>
                    <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                        {rubric.title}
                    </h3>
                    {rubric.description && (
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                            {rubric.description}
                        </p>
                    )}
                    <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                        {t('paperSetup.subSteps.rubric.placeholderHint')}
                    </p>
                </div>
            )}
        </div>
    );
}
