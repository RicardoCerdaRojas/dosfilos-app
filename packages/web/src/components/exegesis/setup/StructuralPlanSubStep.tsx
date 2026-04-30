import { ListTree, BookText, Layers, Crosshair } from 'lucide-react';
import { useTranslation } from '@/i18n';
import type { ExegeticalPaper } from '@dosfilos/domain';
import { StepKindEmphasisCard } from './StepKindEmphasisCard';

/**
 * Structural plan sub-step.
 *
 * Surfaces the per-kind emphasis editor as three independent cards
 * (introduction / verses / conclusion). Each card pre-fills from the
 * rubric's `structuralExpectations` and lets the student override
 * with academic justification visible.
 *
 * v1 deliberately does NOT expose per-step (per-verse) overrides —
 * that's a v1.5 feature once the student has lived with kind-level
 * customization long enough to know where they need finer control.
 */
interface StructuralPlanSubStepProps {
    paper: ExegeticalPaper;
}

export function StructuralPlanSubStep({ paper }: StructuralPlanSubStepProps) {
    const { t } = useTranslation('exegesis');

    if (!paper.rubric) {
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
                <p className="text-xs text-amber-700 dark:text-amber-300 italic">
                    {t('paperSetup.subSteps.plan.noRubric')}
                </p>
            </div>
        );
    }

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

            <StepKindEmphasisCard paper={paper} kind="introduction" icon={<BookText className="h-4 w-4" />} />
            <StepKindEmphasisCard paper={paper} kind="verse" icon={<Crosshair className="h-4 w-4" />} />
            <StepKindEmphasisCard paper={paper} kind="conclusion" icon={<Layers className="h-4 w-4" />} />
        </div>
    );
}
