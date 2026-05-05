import { useMemo } from 'react';
import { Sparkles, AlertTriangle, Loader2, RefreshCw, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n';
import {
    formatPassageReference,
    isStepPlanStale,
    type ExegeticalPaper,
    type ExegeticalStep,
    type ExegeticalStepKind,
} from '@dosfilos/domain';
import { Button } from '@/components/ui/button';
import {
    useProposeStepCorpusAllocations,
    useUpdateStepCorpusAllocation,
} from '@/hooks/exegesis/useStepCorpusAllocations';
import { PinnedSourcesPicker } from './PinnedSourcesPicker';

interface CorpusUsagePlanSubStepProps {
    paper: ExegeticalPaper;
}

/**
 * v1.7 corpus-usage planning sub-step.
 *
 * Renders the per-step pinned-sources allocation: rows = generation
 * steps (introduction / verses / conclusion), cells = chips with the
 * pinned `ProjectSource` ids + the LLM rationale.
 *
 * Three states:
 *   - **Empty** (planner never ran): "Proponer plan" CTA + helper copy
 *     explaining what the planner does.
 *   - **Proposed/Accepted** (`stepPlan.proposedAt` set): table is
 *     visible + editable; "Regenerar plan" available; if the corpus
 *     changed since proposal (`isStepPlanStale`), a non-blocking
 *     amber banner appears.
 *   - **No corpus**: gentle empty state pointing the user back to the
 *     Corpus tab.
 *
 * Edits are individual chip add/remove on each row via
 * `PinnedSourcesPicker`. The full regenerate is the propose-mutation
 * (overwrites all per-step allocations but preserves manual edits to
 * `note`/`emphasis`/`suppressedSources` per the use case spec).
 */
export function CorpusUsagePlanSubStep({ paper }: CorpusUsagePlanSubStepProps) {
    const { t } = useTranslation('exegesis');
    const propose = useProposeStepCorpusAllocations();
    const updateAllocation = useUpdateStepCorpusAllocation();

    // Filter to LLM-driven steps (assembly is mechanical and doesn't
    // consume the corpus). Sort by `order` so the table follows the
    // wizard's own step order.
    const plannableSteps = useMemo(
        () => paper.steps.filter(s => s.kind !== 'assembly').sort((a, b) => a.order - b.order),
        [paper.steps],
    );

    const stale = isStepPlanStale(paper);
    const hasProposal = paper.stepPlan.proposedAt != null;
    const hasCorpus = paper.sources.length > 0;
    const hasSteps = plannableSteps.length > 0;

    const handlePropose = async () => {
        try {
            const result = await propose.mutateAsync({ paperId: paper.id });
            toast.success(
                t('paperSetup.subSteps.corpus-plan.toastPropose', {
                    count: result.nonEmptyAllocationCount,
                }),
            );
        } catch (err) {
            console.error('[CorpusUsagePlan] propose failed:', err);
            toast.error(t('paperSetup.subSteps.corpus-plan.toastProposeError'));
        }
    };

    const handleUpdateRow = async (stepId: string, pinnedSources: ReadonlyArray<string>) => {
        try {
            await updateAllocation.mutateAsync({
                paperId: paper.id,
                stepId,
                pinnedSources,
            });
        } catch (err) {
            console.error('[CorpusUsagePlan] update failed:', err);
            toast.error(t('paperSetup.subSteps.corpus-plan.toastUpdateError'));
        }
    };

    return (
        <div className="space-y-4">
            <header className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-success mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold text-foreground">
                        {t('paperSetup.subSteps.corpus-plan.heading')}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {t('paperSetup.subSteps.corpus-plan.description')}
                    </p>
                </div>
            </header>

            {!hasCorpus && <EmptyCorpusState />}
            {hasCorpus && !hasSteps && <NoStepsState />}

            {hasCorpus && hasSteps && (
                <>
                    {!hasProposal && (
                        <EmptyProposalState
                            isLoading={propose.isPending}
                            onPropose={handlePropose}
                        />
                    )}

                    {hasProposal && stale && (
                        <StaleBanner
                            isLoading={propose.isPending}
                            onRegenerate={handlePropose}
                        />
                    )}

                    {hasProposal && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-xs text-muted-foreground">
                                    {t('paperSetup.subSteps.corpus-plan.lastProposed', {
                                        when: formatLastProposed(paper.stepPlan.proposedAt!),
                                    })}
                                </p>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={handlePropose}
                                    disabled={propose.isPending}
                                    className="text-xs gap-1.5"
                                >
                                    {propose.isPending
                                        ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                                        : <RefreshCw className="h-3 w-3" aria-hidden />}
                                    {t('paperSetup.subSteps.corpus-plan.regenerate')}
                                </Button>
                            </div>

                            <div className="rounded-lg border border-border bg-card overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
                                        <tr>
                                            <th className="text-left px-3 py-2 w-[140px]">
                                                {t('paperSetup.subSteps.corpus-plan.colStep')}
                                            </th>
                                            <th className="text-left px-3 py-2">
                                                {t('paperSetup.subSteps.corpus-plan.colPinned')}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {plannableSteps.map(step => (
                                            <PlanRow
                                                key={step.id}
                                                step={step}
                                                paper={paper}
                                                onChangePinned={pinned => handleUpdateRow(step.id, pinned)}
                                                disabled={updateAllocation.isPending}
                                            />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

// ── Sub-components ──────────────────────────────────────────────────────

function PlanRow({
    step,
    paper,
    onChangePinned,
    disabled,
}: {
    step: ExegeticalStep;
    paper: ExegeticalPaper;
    onChangePinned: (next: ReadonlyArray<string>) => void;
    disabled: boolean;
}) {
    const { t } = useTranslation('exegesis');
    const entry = paper.stepPlan.perStep[step.id];
    const pinned = entry?.pinnedSources ?? [];
    const note = entry?.note ?? null;
    const label = stepLabel(step, paper.displayLanguage, t);

    return (
        <tr className="border-t border-border/60 align-top">
            <td className="px-3 py-2.5 text-[12.5px] font-medium text-foreground">
                {label}
                <span className="block text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                    {t(`paperSetup.subSteps.corpus-plan.kind.${step.kind}`)}
                </span>
            </td>
            <td className="px-3 py-2.5 space-y-1.5">
                <PinnedSourcesPicker
                    sources={paper.sources}
                    selected={pinned}
                    onChange={onChangePinned}
                    disabled={disabled}
                />
                {note && (
                    <p className="text-[11px] text-muted-foreground italic leading-snug">
                        <Lightbulb className="inline h-2.5 w-2.5 mr-1 text-info" aria-hidden />
                        {note}
                    </p>
                )}
            </td>
        </tr>
    );
}

function EmptyCorpusState() {
    const { t } = useTranslation('exegesis');
    return (
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-5 text-center text-sm text-muted-foreground">
            {t('paperSetup.subSteps.corpus-plan.emptyCorpus')}
        </div>
    );
}

function NoStepsState() {
    const { t } = useTranslation('exegesis');
    return (
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-5 text-center text-sm text-muted-foreground">
            {t('paperSetup.subSteps.corpus-plan.noSteps')}
        </div>
    );
}

function EmptyProposalState({
    isLoading,
    onPropose,
}: {
    isLoading: boolean;
    onPropose: () => void;
}) {
    const { t } = useTranslation('exegesis');
    return (
        <div className="rounded-lg border border-info/30 bg-info-subtle/40 p-4 space-y-3">
            <div className="flex items-start gap-3">
                <Lightbulb className="h-4 w-4 text-info mt-0.5 shrink-0" aria-hidden />
                <div className="flex-1 min-w-0 space-y-1">
                    <h3 className="text-sm font-semibold text-foreground">
                        {t('paperSetup.subSteps.corpus-plan.emptyProposalTitle')}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-snug">
                        {t('paperSetup.subSteps.corpus-plan.emptyProposalBody')}
                    </p>
                </div>
            </div>
            <Button
                type="button"
                onClick={onPropose}
                disabled={isLoading}
                className="w-full sm:w-auto gap-2"
            >
                {isLoading
                    ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    : <Sparkles className="h-4 w-4" aria-hidden />}
                {isLoading
                    ? t('paperSetup.subSteps.corpus-plan.proposingCta')
                    : t('paperSetup.subSteps.corpus-plan.proposeCta')}
            </Button>
        </div>
    );
}

function StaleBanner({
    isLoading,
    onRegenerate,
}: {
    isLoading: boolean;
    onRegenerate: () => void;
}) {
    const { t } = useTranslation('exegesis');
    return (
        <div className="rounded-lg border border-warning/40 bg-warning-subtle p-3 space-y-2">
            <div className="flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" aria-hidden />
                <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] font-semibold text-warning-subtle-foreground">
                        {t('paperSetup.subSteps.corpus-plan.staleTitle')}
                    </p>
                    <p className="text-[11px] text-warning-subtle-foreground leading-snug mt-0.5">
                        {t('paperSetup.subSteps.corpus-plan.staleBody')}
                    </p>
                </div>
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={onRegenerate}
                    disabled={isLoading}
                    className="text-[11px] gap-1 shrink-0"
                >
                    {isLoading
                        ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                        : <RefreshCw className="h-3 w-3" aria-hidden />}
                    {t('paperSetup.subSteps.corpus-plan.staleRegenerate')}
                </Button>
            </div>
        </div>
    );
}

// ── Helpers ─────────────────────────────────────────────────────────────

function stepLabel(
    step: ExegeticalStep,
    language: 'es' | 'en',
    t: (key: string) => string,
): string {
    if (step.kind === 'verse' && step.verseRef) {
        return formatPassageReference(step.verseRef, language);
    }
    if (step.kind === 'introduction') return t('paperSetup.subSteps.corpus-plan.kind.introduction');
    if (step.kind === 'conclusion') return t('paperSetup.subSteps.corpus-plan.kind.conclusion');
    return step.kind as ExegeticalStepKind;
}

function formatLastProposed(when: Date): string {
    return when.toLocaleString();
}
