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
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
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
            <div className="rounded-lg border border-success/30 bg-success-subtle p-4 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-success mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-success-subtle-foreground">
                        {t('paperSetup.subSteps.corpus.gap.metTitle')}
                    </h3>
                    <p className="text-xs text-success-subtle-foreground mt-1">
                        {t('paperSetup.subSteps.corpus.gap.metBody', { count: totalSources })}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-lg border border-warning/30 bg-warning-subtle p-4 space-y-3">
            <header className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-warning mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-warning-subtle-foreground">
                        {t('paperSetup.subSteps.corpus.gap.gapsTitle', {
                            satisfied: report.requirements.filter(r => r.satisfied).length,
                            total: visibleRequirements.length,
                        })}
                    </h3>
                    <p className="text-xs text-warning-subtle-foreground mt-1">
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
                <CheckCircle2 className="h-3.5 w-3.5 text-success mt-0.5 shrink-0" />
            ) : (
                <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-warning text-warning-foreground text-[10px] font-semibold mt-0 shrink-0">
                    {check.missing}
                </span>
            )}
            <div className="flex-1 min-w-0">
                <p className={check.satisfied
                    ? 'text-success-subtle-foreground font-medium'
                    : 'text-warning-subtle-foreground font-medium'}
                >
                    {label} · {check.have}/{check.required}
                </p>
                <p className="text-warning-subtle-foreground leading-snug mt-0.5">
                    {check.justification}
                </p>
                <p className="text-[11px] text-muted-foreground italic mt-0.5">
                    {examples}
                </p>
            </div>
        </li>
    );
}
