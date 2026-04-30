import { ListTree } from 'lucide-react';
import { useTranslation } from '@/i18n';
import type { ExegeticalPaper } from '@dosfilos/domain';

/**
 * Structural plan sub-step (Phase 2G placeholder shell).
 *
 * What lands here in 2G:
 *   - For each step kind (intro, verse, conclusion), a card showing:
 *     - The rubric's recommended emphasis for this step
 *       (`StructuralExpectation.emphasizedTypes`).
 *     - Pedagogical justification visible as the default copy.
 *     - Editable per-step plan: which `SourceType`s to emphasize,
 *       which specific sources to pin/suppress, citation override.
 *   - "Accept all suggestions" shortcut for experienced students.
 *   - Note field per step where the student can document their
 *     reasoning.
 *
 * The plan persists on `paper.stepPlan` and is consumed by the
 * orchestrator at generation time.
 */
interface StructuralPlanSubStepProps {
    paper: ExegeticalPaper;
}

export function StructuralPlanSubStep({ paper }: StructuralPlanSubStepProps) {
    const { t } = useTranslation('exegesis');
    const planEntryCount = Object.keys(paper.stepPlan.perStep).length;

    return (
        <div className="space-y-4">
            <header className="flex items-start gap-3">
                <ListTree className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                <div>
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                        {t('paperSetup.subSteps.plan.heading')}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        {t('paperSetup.subSteps.plan.description')}
                    </p>
                </div>
            </header>

            <div className="rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50 p-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    {t('paperSetup.subSteps.plan.placeholderHint', { count: planEntryCount })}
                </p>
            </div>
        </div>
    );
}
