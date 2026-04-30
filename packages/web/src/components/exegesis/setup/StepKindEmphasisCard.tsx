import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, RotateCcw, Sparkles, X, Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
    SOURCE_TYPE_GROUPS,
    type ExegeticalPaper,
    type SourceType,
    type StepEmphasis,
} from '@dosfilos/domain';
import { UpdateStepPlanUseCase } from '@dosfilos/application';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n';
import { useExegesisPapers } from '@/hooks/exegesis/useExegesisPapers';

/**
 * Editor for one step kind's emphasis (introduction / verse / conclusion).
 *
 * The card is the unit of pedagogy: it shows the rubric's suggested
 * emphasis with academic justification, then lets the student
 * adjust. "Reset to rubric suggestion" puts the chips back to what
 * the rubric proposed; "Save plan" persists the override on
 * `paper.stepPlan.defaults[kind]`.
 *
 * Design choices:
 *   - Chips for emphasized types — multi-select via add/remove.
 *     Each chip carries its localized label so non-experts can read
 *     it without docs.
 *   - De-emphasized types are hidden behind a toggle ("Show types
 *     to de-emphasize") because most students never need them; they
 *     dilute the primary signal.
 *   - Note is local-only state that's NOT persisted in v1 (the
 *     domain `StepEmphasis` doesn't carry a note today; per-step
 *     notes live in `StepSourcePlanEntry.note` which v1.5 wires).
 *     Keeping the textarea in the UI lets the student think out
 *     loud and primes the v1.5 surface.
 *
 * Edits are staged in local state; nothing persists until "Save plan"
 * fires. This keeps the orchestrator's view of the plan stable while
 * the student is mid-edit.
 */
interface StepKindEmphasisCardProps {
    paper: ExegeticalPaper;
    kind: 'introduction' | 'verse' | 'conclusion';
    icon: React.ReactNode;
}

export function StepKindEmphasisCard({ paper, kind, icon }: StepKindEmphasisCardProps) {
    const { t } = useTranslation('exegesis');
    const { updateStepPlan } = useExegesisPapers();

    const rubricSuggestion = useMemo(
        () => UpdateStepPlanUseCase.rubricDefaultEmphasis(paper, kind),
        [paper, kind],
    );
    const persistedEmphasis: StepEmphasis = paper.stepPlan.defaults[kind];

    // Whether the persisted plan diverges from the rubric suggestion.
    // Lets the UI badge "tu plan personalizado" vs "default".
    const isCustomized = useMemo(() => {
        const sameLength =
            persistedEmphasis.emphasizedTypes.length === rubricSuggestion.emphasizedTypes.length &&
            persistedEmphasis.deemphasizedTypes.length === rubricSuggestion.deemphasizedTypes.length;
        if (!sameLength) return true;
        const setEq = (a: ReadonlyArray<SourceType>, b: ReadonlyArray<SourceType>) => {
            const setA = new Set(a);
            return b.every(x => setA.has(x));
        };
        return !(setEq(persistedEmphasis.emphasizedTypes, rubricSuggestion.emphasizedTypes)
            && setEq(persistedEmphasis.deemphasizedTypes, rubricSuggestion.deemphasizedTypes));
    }, [persistedEmphasis, rubricSuggestion]);

    // Form state. Initial value = persisted (custom or rubric-default).
    const [emphasized, setEmphasized] = useState<SourceType[]>([...persistedEmphasis.emphasizedTypes]);
    const [deemphasized, setDeemphasized] = useState<SourceType[]>([...persistedEmphasis.deemphasizedTypes]);
    const [note, setNote] = useState('');
    const [showDeemphasized, setShowDeemphasized] = useState(persistedEmphasis.deemphasizedTypes.length > 0);

    // Re-sync when the persisted plan changes externally (e.g. another
    // tab saved). Avoids losing in-progress edits by only resetting
    // when the persisted snapshot identity changes — Object.is below
    // catches the React Query refetch case.
    useEffect(() => {
        setEmphasized([...persistedEmphasis.emphasizedTypes]);
        setDeemphasized([...persistedEmphasis.deemphasizedTypes]);
    }, [persistedEmphasis]);

    const justification = paper.rubric?.structuralExpectations.find(e => e.section === kind)?.justification;

    const handleSave = async () => {
        const nextEmphasis: StepEmphasis = {
            emphasizedTypes: emphasized,
            deemphasizedTypes: showDeemphasized ? deemphasized : [],
            citationOverrides: persistedEmphasis.citationOverrides, // v1 doesn't edit overrides
        };
        try {
            await updateStepPlan.mutateAsync({
                paperId: paper.id,
                [kind]: nextEmphasis,
            } as any);
            toast.success(t('paperSetup.subSteps.plan.saved'));
        } catch (err) {
            console.error('[exegesis] save step plan failed:', err);
            toast.error(t('paperSetup.subSteps.plan.saveFailed'));
        }
    };

    const handleReset = () => {
        setEmphasized([...rubricSuggestion.emphasizedTypes]);
        setDeemphasized([...rubricSuggestion.deemphasizedTypes]);
    };

    const allSourceTypes = useMemo(() => SOURCE_TYPE_GROUPS.flatMap(g => g.types as ReadonlyArray<SourceType>), []);
    const availableForEmphasis = allSourceTypes.filter(t => !emphasized.includes(t) && !deemphasized.includes(t));
    const availableForDeemphasis = allSourceTypes.filter(t => !emphasized.includes(t) && !deemphasized.includes(t));

    return (
        <section className="rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-4">
            <header className="flex items-start gap-3">
                <span className="text-emerald-600 dark:text-emerald-400 mt-0.5">{icon}</span>
                <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 inline-flex items-center gap-2">
                        {t(`paperSetup.subSteps.plan.kinds.${kind}`)}
                        {isCustomized && (
                            <span className="text-[10px] uppercase tracking-wide font-semibold rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5">
                                {/* "personalizado" / "customized" via re-using the saved label is overkill; inline literal is simpler */}
                                {t('paperSetup.subSteps.plan.savedHint')}
                            </span>
                        )}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {t(`paperSetup.subSteps.plan.kindDescription.${kind}`)}
                    </p>
                </div>
            </header>

            {justification && (
                <div className="rounded-md bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/40 px-3 py-2 flex items-start gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-[11px] uppercase tracking-wide font-semibold text-emerald-700 dark:text-emerald-300">
                            {t('paperSetup.subSteps.plan.rubricSuggestion')}
                        </p>
                        <p className="text-xs text-emerald-900 dark:text-emerald-100 leading-snug mt-0.5">
                            {justification}
                        </p>
                    </div>
                </div>
            )}

            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        {t('paperSetup.subSteps.plan.emphasizedTypesLabel')}
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {t('paperSetup.subSteps.plan.emphasizedTypesHint')}
                    </p>
                </div>
                <ChipMultiSelect
                    selected={emphasized}
                    available={availableForEmphasis}
                    rubricSuggested={rubricSuggestion.emphasizedTypes}
                    onAdd={(t) => setEmphasized([...emphasized, t])}
                    onRemove={(t) => setEmphasized(emphasized.filter(x => x !== t))}
                />
            </div>

            <button
                type="button"
                onClick={() => setShowDeemphasized(!showDeemphasized)}
                className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 underline-offset-2 hover:underline"
            >
                {t('paperSetup.subSteps.plan.deemphasizedToggle')}
            </button>

            {showDeemphasized && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                            {t('paperSetup.subSteps.plan.deemphasizedTypesLabel')}
                        </label>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {t('paperSetup.subSteps.plan.deemphasizedTypesHint')}
                        </p>
                    </div>
                    <ChipMultiSelect
                        selected={deemphasized}
                        available={availableForDeemphasis}
                        rubricSuggested={rubricSuggestion.deemphasizedTypes}
                        onAdd={(t) => setDeemphasized([...deemphasized, t])}
                        onRemove={(t) => setDeemphasized(deemphasized.filter(x => x !== t))}
                    />
                </div>
            )}

            <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {t('paperSetup.subSteps.plan.noteLabel')}
                </label>
                <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={t('paperSetup.subSteps.plan.notePlaceholder')}
                    rows={2}
                    className="w-full rounded-md border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 resize-y"
                />
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {t('paperSetup.subSteps.plan.noteHint')}
                </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-zinc-800">
                <Button
                    type="button"
                    variant="ghost"
                    onClick={handleReset}
                    className="text-xs"
                >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    {t('paperSetup.subSteps.plan.resetButton')}
                </Button>
                <Button
                    type="button"
                    onClick={handleSave}
                    disabled={updateStepPlan.isPending}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 text-xs"
                >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {t('paperSetup.subSteps.plan.saveButton')}
                </Button>
            </div>
        </section>
    );
}

// ── ChipMultiSelect ─────────────────────────────────────────────────────

interface ChipMultiSelectProps {
    selected: ReadonlyArray<SourceType>;
    available: ReadonlyArray<SourceType>;
    rubricSuggested: ReadonlyArray<SourceType>;
    onAdd: (t: SourceType) => void;
    onRemove: (t: SourceType) => void;
}

function ChipMultiSelect({ selected, available, rubricSuggested, onAdd, onRemove }: ChipMultiSelectProps) {
    const { t } = useTranslation('exegesis');
    const [adding, setAdding] = useState(false);
    const rubricSet = useMemo(() => new Set(rubricSuggested), [rubricSuggested]);

    return (
        <div className="space-y-2">
            <ul className="flex flex-wrap gap-1.5">
                {selected.map(type => {
                    const fromRubric = rubricSet.has(type);
                    return (
                        <li
                            key={type}
                            className={[
                                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium',
                                fromRubric
                                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200'
                                    : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-200',
                            ].join(' ')}
                        >
                            {fromRubric && <Sparkles className="h-2.5 w-2.5" />}
                            <span>{t(`sourceTypes.${type}.label`)}</span>
                            <button
                                type="button"
                                onClick={() => onRemove(type)}
                                className="hover:text-rose-500"
                                aria-label={`Remove ${type}`}
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </li>
                    );
                })}
                {selected.length === 0 && (
                    <li className="text-[11px] text-slate-400 italic">
                        {t('paperSetup.subSteps.plan.rubricEmpty')}
                    </li>
                )}
            </ul>
            {adding ? (
                <select
                    autoFocus
                    onChange={(e) => {
                        const v = e.target.value as SourceType;
                        if (v) {
                            onAdd(v);
                            setAdding(false);
                        }
                    }}
                    onBlur={() => setAdding(false)}
                    className="rounded-md border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2 py-1 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                >
                    <option value="">— {t('paperSetup.subSteps.plan.addType')} —</option>
                    {SOURCE_TYPE_GROUPS.map(group => {
                        const groupAvailable = group.types.filter(typ => available.includes(typ as SourceType)) as ReadonlyArray<SourceType>;
                        if (groupAvailable.length === 0) return null;
                        return (
                            <optgroup key={group.groupKey} label={t(`sourceTypeGroups.${group.groupKey}`)}>
                                {groupAvailable.map(typ => (
                                    <option key={typ} value={typ}>{t(`sourceTypes.${typ}.label`)}</option>
                                ))}
                            </optgroup>
                        );
                    })}
                </select>
            ) : (
                <button
                    type="button"
                    onClick={() => setAdding(true)}
                    disabled={available.length === 0}
                    className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-300 disabled:opacity-50"
                >
                    <Plus className="h-3 w-3" />
                    {t('paperSetup.subSteps.plan.addType')}
                </button>
            )}
        </div>
    );
}
