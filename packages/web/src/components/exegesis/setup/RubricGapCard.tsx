import { CheckCircle2, AlertTriangle } from 'lucide-react';
import {
    computeRubricCompliance,
    type ExegeticalPaper,
    type RequirementCheck,
} from '@dosfilos/domain';
import { useTranslation } from '@/i18n';

/**
 * Visual gap analysis between the paper's corpus and its rubric.
 *
 * Renders one of two states:
 *   - All minimums met → green "compliant" banner with a count of
 *     sources and an encouraging next-step nudge.
 *   - One or more gaps → amber/red banner listing the missing types,
 *     each with the rubric's pedagogical justification + examples
 *     localized through the SourceType i18n catalog. Optional
 *     requirements that have no entries are NOT shown — they'd dilute
 *     the signal.
 *
 * The card is read-only: it explains the gap but doesn't take an
 * action. The upload form below is the action.
 *
 * Stateless component. Recomputed by the parent on every source
 * change so the card stays in sync without effects.
 */
interface RubricGapCardProps {
    paper: ExegeticalPaper;
}

export function RubricGapCard({ paper }: RubricGapCardProps) {
    const { t } = useTranslation('exegesis');
    const rubric = paper.rubric;

    if (!rubric) {
        return (
            <div className="rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 p-3 text-xs text-slate-500 dark:text-slate-400">
                {t('paperSetup.subSteps.corpus.gap.noRubric')}
            </div>
        );
    }

    const sourceTypes = paper.sources.map(s => s.sourceType);
    const report = computeRubricCompliance(sourceTypes, rubric);

    // Surface only requirements with `required > 0` — zero-minimum
    // entries are recommendations, shown later in a separate
    // collapsible if the user wants to engage them. Keeps the gap
    // signal sharp.
    const visibleRequirements = report.requirements.filter(r => r.required > 0);
    const totalSources = paper.sources.length;

    if (report.meetsMinimums) {
        return (
            <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-900/20 p-4 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                        {t('paperSetup.subSteps.corpus.gap.metTitle')}
                    </h3>
                    <p className="text-xs text-emerald-800 dark:text-emerald-200 mt-1">
                        {t('paperSetup.subSteps.corpus.gap.metBody', { count: totalSources })}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/20 p-4 space-y-3">
            <header className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                        {t('paperSetup.subSteps.corpus.gap.gapsTitle', {
                            satisfied: report.requirements.filter(r => r.satisfied).length,
                            total: visibleRequirements.length,
                        })}
                    </h3>
                    <p className="text-xs text-amber-800 dark:text-amber-200 mt-1">
                        {t('paperSetup.subSteps.corpus.gap.gapsBody', { missing: report.totalMissing })}
                    </p>
                </div>
            </header>
            <ul className="space-y-2 pl-7">
                {visibleRequirements
                    .filter(r => !r.satisfied)
                    .map(r => (
                        <RequirementRow key={r.sourceType} check={r} />
                    ))}
                {visibleRequirements
                    .filter(r => r.satisfied)
                    .map(r => (
                        <RequirementRow key={r.sourceType} check={r} />
                    ))}
            </ul>
        </div>
    );
}

function RequirementRow({ check }: { check: RequirementCheck }) {
    const { t } = useTranslation('exegesis');
    const label = t(`sourceTypes.${check.sourceType}.label`);
    const examples = t(`sourceTypes.${check.sourceType}.examples`);

    return (
        <li className="flex items-start gap-2 text-xs">
            {check.satisfied ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
            ) : (
                <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-amber-200 dark:bg-amber-800 text-[10px] font-semibold text-amber-900 dark:text-amber-100 mt-0 shrink-0">
                    {check.missing}
                </span>
            )}
            <div className="flex-1 min-w-0">
                <p className={check.satisfied
                    ? 'text-emerald-900 dark:text-emerald-100 font-medium'
                    : 'text-amber-900 dark:text-amber-100 font-medium'}
                >
                    {label} · {check.have}/{check.required}
                </p>
                <p className="text-amber-800 dark:text-amber-200 leading-snug mt-0.5">
                    {check.justification}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 italic mt-0.5">
                    {examples}
                </p>
            </div>
        </li>
    );
}
