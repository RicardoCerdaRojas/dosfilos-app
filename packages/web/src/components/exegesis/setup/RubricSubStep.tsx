import { useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle,
    CheckCircle2,
    FileCheck2,
    Loader2,
    RotateCcw,
    Pencil,
    Save,
    Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import {
    SOURCE_TYPE_GROUPS,
    type ExegeticalPaper,
    type PaperRubric,
    type SourceRequirement,
    type SourceType,
} from '@dosfilos/domain';
import { RequirementRow, AddRequirementButton } from '@/components/exegesis/rubric/RequirementRow';
import { Button } from '@/components/ui/button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useTranslation } from '@/i18n';
import { useExegesisPapers } from '@/hooks/exegesis/useExegesisPapers';
import { useUserRubrics } from '@/hooks/exegesis/useUserRubrics';
import { useUserStyleGuides } from '@/hooks/exegesis/useUserStyleGuides';

/**
 * Rubric editor.
 *
 * Sections (top to bottom):
 *   1. Provenance + upload-soon banner.
 *   2. Metadata: title, description, citation standard, expected length.
 *   3. Corpus requirements: full CRUD list. The most-likely customization
 *      surface — students tweak minimums when their seminary is more
 *      lenient or stricter than the academic default.
 *   4. Structural recommendations: read-only summary of what each step
 *      should emphasize. Edits to per-kind emphasis live in the Plan
 *      tab (2G); the rubric defines the source-of-truth recommendation,
 *      the plan stores the student's accepted/customized version.
 *
 * Local-state-then-save pattern: edits stage in component state and
 * only persist on "Save". This keeps the orchestrator's view of the
 * rubric stable mid-edit and lets the student abandon changes by
 * navigating away.
 */
interface RubricSubStepProps {
    paper: ExegeticalPaper;
}

export function RubricSubStep({ paper }: RubricSubStepProps) {
    const { t } = useTranslation('exegesis');
    const rubric = paper.rubric;

    if (!rubric) {
        return (
            <div className="space-y-3">
                <header className="flex items-start gap-3">
                    <FileCheck2 className="h-5 w-5 text-success mt-0.5 shrink-0" />
                    <div>
                        <h2 className="text-lg font-semibold text-foreground">
                            {t('paperSetup.subSteps.rubric.heading')}
                        </h2>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {t('paperSetup.subSteps.rubric.description')}
                        </p>
                    </div>
                </header>
                <p className="text-xs text-muted-foreground inline-flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {t('paperSetup.subSteps.rubric.loading')}
                </p>
            </div>
        );
    }

    return <RubricEditor paper={paper} rubric={rubric} />;
}

// ── Editor ─────────────────────────────────────────────────────────────

interface RubricEditorProps {
    paper: ExegeticalPaper;
    rubric: PaperRubric;
}

function RubricEditor({ paper, rubric }: RubricEditorProps) {
    const { t } = useTranslation('exegesis');
    // The mutation lives in this component because the click handlers
    // (handleSave / handleReset) trigger it from here. Reading the
    // pending state from the SAME hook instance keeps the spinner in
    // sync with the actual in-flight call — earlier the parent passed
    // pending state from a separate useExegesisPapers() instance and
    // the spinner never flipped.
    const { updateRubric, resetRubric } = useExegesisPapers();
    const updatePending = updateRubric.isPending;
    const resetPending = resetRubric.isPending;

    // View mode for the rubric body.
    //   'summary'  → compact read-only digest (default landing).
    //   'editing'  → the full form with inputs / requirement CRUD.
    // Picking a template or extracting from text always lands the
    // user back in 'summary' so they can SEE the result before
    // committing to a manual tweak. The "Editar rúbrica" button
    // flips to 'editing'; saving or cancelling flips back.
    const [mode, setMode] = useState<'summary' | 'editing'>('summary');

    // Extract-from-text dialog. Lives behind a button in the header
    // because most of the time the user doesn't need it (they apply
    // a saved template). When they DO need it, it warrants the focus
    // a modal gives.
    const [extractOpen, setExtractOpen] = useState(false);

    // Form state seeded from the persisted rubric. Re-syncs whenever
    // the persisted rubric reference changes (e.g. another tab saved
    // or reset). In-flight edits are lost on those events — that's
    // acceptable for v1 since concurrent multi-tab editing is rare.
    const [description, setDescription] = useState<string>(rubric.description ?? '');
    const [citationStandard, setCitationStandard] = useState<string>(rubric.citationStandard ?? '');
    const [lengthUnit, setLengthUnit] = useState<'pages' | 'words'>(rubric.expectedLength?.unit ?? 'pages');
    const [lengthMin, setLengthMin] = useState<string>(rubric.expectedLength?.min?.toString() ?? '');
    const [lengthMax, setLengthMax] = useState<string>(rubric.expectedLength?.max?.toString() ?? '');
    const [requirements, setRequirements] = useState<SourceRequirement[]>([...rubric.sourceRequirements]);

    useEffect(() => {
        setDescription(rubric.description ?? '');
        setCitationStandard(rubric.citationStandard ?? '');
        setLengthUnit(rubric.expectedLength?.unit ?? 'pages');
        setLengthMin(rubric.expectedLength?.min?.toString() ?? '');
        setLengthMax(rubric.expectedLength?.max?.toString() ?? '');
        setRequirements([...rubric.sourceRequirements]);
        // When the rubric reference changes (template applied / extracted /
        // reset), drop edit mode so the user sees the new content first.
        setMode('summary');
    }, [rubric]);

    const usedTypes = useMemo(() => new Set(requirements.map(r => r.sourceType)), [requirements]);
    const allSourceTypes = useMemo(
        () => SOURCE_TYPE_GROUPS.flatMap(g => g.types as ReadonlyArray<SourceType>),
        [],
    );
    const availableTypes = useMemo(
        () => allSourceTypes.filter(typ => !usedTypes.has(typ)),
        [allSourceTypes, usedTypes],
    );

    const handleSave = async () => {
        const minN = lengthMin === '' ? null : Number(lengthMin);
        const maxN = lengthMax === '' ? null : Number(lengthMax);
        const expectedLength = (minN === null && maxN === null)
            ? null
            : { unit: lengthUnit, min: minN, max: maxN };
        try {
            await updateRubric.mutateAsync({
                paperId: paper.id,
                description: description.trim() || null,
                citationStandard: citationStandard.trim() || null,
                expectedLength,
                sourceRequirements: requirements,
            });
            toast.success(t('paperSetup.subSteps.rubric.actions.saved'));
            // The useEffect on [rubric] will flip mode back to
            // summary when the refetched rubric arrives, but we set
            // it here too so the transition is immediate (no flicker
            // of stale form values).
            setMode('summary');
        } catch (err) {
            console.error('[exegesis] save rubric failed:', err);
            toast.error(t('paperSetup.subSteps.rubric.actions.saveFailed'));
        }
    };

    const [confirmResetOpen, setConfirmResetOpen] = useState(false);

    const handleReset = () => setConfirmResetOpen(true);

    const doReset = async () => {
        setConfirmResetOpen(false);
        try {
            await resetRubric.mutateAsync({ paperId: paper.id });
            toast.success(t('paperSetup.subSteps.rubric.actions.resetDone'));
        } catch (err) {
            console.error('[exegesis] reset rubric failed:', err);
            toast.error(t('paperSetup.subSteps.rubric.actions.resetFailed'));
        }
    };

    const updateRequirement = (idx: number, patch: Partial<SourceRequirement>) => {
        setRequirements(reqs => reqs.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
    };

    const removeRequirement = (idx: number) => {
        setRequirements(reqs => reqs.filter((_, i) => i !== idx));
    };

    const addRequirement = (type: SourceType) => {
        if (usedTypes.has(type)) {
            toast.error(t('paperSetup.subSteps.rubric.requirements.duplicateError'));
            return;
        }
        setRequirements(reqs => [
            ...reqs,
            {
                sourceType: type,
                minimum: 1,
                maximum: null,
                justification: '',
            },
        ]);
    };

    return (
        <div className="space-y-6">
            <header className="flex items-start gap-3">
                <FileCheck2 className="h-5 w-5 text-success mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold text-foreground inline-flex items-center gap-2">
                        {t('paperSetup.subSteps.rubric.heading')}
                        <span className="text-[10px] uppercase tracking-wide font-semibold rounded-full bg-muted text-muted-foreground px-2 py-0.5">
                            {t(`paperSetup.subSteps.rubric.provenance.${rubric.provenance}`)}
                        </span>
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {t('paperSetup.subSteps.rubric.description')}
                    </p>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setExtractOpen(true)}
                    className="shrink-0 text-xs"
                >
                    <Sparkles className="h-3 w-3 mr-1" />
                    {t('paperSetup.subSteps.rubric.extract.openCta')}
                </Button>
            </header>

            {/* Plantillas FIRST — primary path for repeat users. The
                extract-from-text path lives in a dialog opened from
                the header (secondary action — most users apply a
                saved template, not extract from scratch every time). */}
            <RubricTemplatesPanel paper={paper} />

            <Dialog open={extractOpen} onOpenChange={setExtractOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="inline-flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-success" />
                            {t('paperSetup.subSteps.rubric.extract.title')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('paperSetup.subSteps.rubric.extract.subtitle')}
                        </DialogDescription>
                    </DialogHeader>
                    <RubricExtractFromTextPanel paper={paper} onExtracted={() => setExtractOpen(false)} />
                </DialogContent>
            </Dialog>

            {mode === 'summary' && (
                <RubricSummaryView
                    paper={paper}
                    rubric={rubric}
                    onEdit={() => setMode('editing')}
                    onReset={handleReset}
                    resetPending={resetPending}
                />
            )}

            {mode === 'editing' && (
                <>

            {/* ── Metadata ── */}
            <section className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">
                    {t('paperSetup.subSteps.rubric.metadata.title')}
                </h3>
                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-medium text-foreground mb-1">
                            {t('paperSetup.subSteps.rubric.metadata.descriptionLabel')}
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={t('paperSetup.subSteps.rubric.metadata.descriptionPlaceholder')}
                            rows={3}
                            className="w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary resize-y"
                        />
                        <p className="text-[11px] text-muted-foreground mt-1 italic">
                            {t('paperSetup.subSteps.rubric.metadata.descriptionHint')}
                        </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
                        <CitationStandardField
                            paper={paper}
                            value={citationStandard}
                            onChange={setCitationStandard}
                        />
                        <div>
                            <label className="block text-xs font-medium text-foreground mb-1">
                                {t('paperSetup.subSteps.rubric.metadata.lengthLabel')}
                            </label>
                            <div className="flex items-center gap-1.5">
                                <input
                                    type="number"
                                    min={0}
                                    value={lengthMin}
                                    onChange={(e) => setLengthMin(e.target.value)}
                                    placeholder={t('paperSetup.subSteps.rubric.metadata.lengthMinPlaceholder')}
                                    className="w-20 rounded-md border border-border bg-card px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                                />
                                <span className="text-xs text-muted-foreground">—</span>
                                <input
                                    type="number"
                                    min={0}
                                    value={lengthMax}
                                    onChange={(e) => setLengthMax(e.target.value)}
                                    placeholder={t('paperSetup.subSteps.rubric.metadata.lengthMaxPlaceholder')}
                                    className="w-20 rounded-md border border-border bg-card px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                                />
                                <select
                                    value={lengthUnit}
                                    onChange={(e) => setLengthUnit(e.target.value as 'pages' | 'words')}
                                    className="rounded-md border border-border bg-card px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                                >
                                    <option value="pages">{t('paperSetup.subSteps.rubric.metadata.lengthUnitPages')}</option>
                                    <option value="words">{t('paperSetup.subSteps.rubric.metadata.lengthUnitWords')}</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Source requirements ── */}
            <section className="space-y-3">
                <header>
                    <h3 className="text-sm font-semibold text-foreground">
                        {t('paperSetup.subSteps.rubric.requirements.title')}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {t('paperSetup.subSteps.rubric.requirements.subtitle')}
                    </p>
                </header>
                {requirements.length === 0 ? (
                    <p className="text-xs text-warning-subtle-foreground italic">
                        {t('paperSetup.subSteps.rubric.requirements.empty')}
                    </p>
                ) : (
                    <ul className="space-y-2">
                        {requirements.map((req, idx) => (
                            <RequirementRow
                                key={req.sourceType}
                                requirement={req}
                                onChange={(patch) => updateRequirement(idx, patch)}
                                onRemove={() => removeRequirement(idx)}
                            />
                        ))}
                    </ul>
                )}
                <AddRequirementButton availableTypes={availableTypes} onAdd={addRequirement} />
            </section>

            {/* ── Structural read-only ── */}
            <section className="space-y-3">
                <header>
                    <h3 className="text-sm font-semibold text-foreground">
                        {t('paperSetup.subSteps.rubric.structural.title')}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {t('paperSetup.subSteps.rubric.structural.subtitle')}
                    </p>
                </header>
                <ul className="space-y-2">
                    {(['introduction', 'verse', 'conclusion'] as const).map(section => {
                        const exp = rubric.structuralExpectations.find(e => e.section === section);
                        return (
                            <li
                                key={section}
                                className="rounded-lg border border-border bg-muted/40 p-3 text-xs space-y-1.5"
                            >
                                <p className="font-medium text-foreground">
                                    {t(`paperSetup.subSteps.rubric.structural.section.${section}`)}
                                </p>
                                {exp ? (
                                    <>
                                        <p className="text-muted-foreground">
                                            <span className="font-medium">{t('paperSetup.subSteps.rubric.structural.emphasizedTypesLabel')}:</span>{' '}
                                            {exp.emphasizedTypes.length === 0
                                                ? '—'
                                                : exp.emphasizedTypes.map(typ => t(`sourceTypes.${typ}.label`)).join(', ')}
                                        </p>
                                        <p className="text-muted-foreground italic">
                                            {exp.justification}
                                        </p>
                                    </>
                                ) : (
                                    <p className="text-muted-foreground italic">
                                        {t('paperSetup.subSteps.rubric.structural.noExpectation')}
                                    </p>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </section>

            {/* ── Actions ── */}
            <footer className="flex items-center justify-between pt-4 border-t border-border">
                <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setMode('summary')}
                    disabled={updatePending}
                    className="text-xs"
                >
                    {t('setup.cancel')}
                </Button>
                <Button
                    type="button"
                    onClick={handleSave}
                    disabled={updatePending}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
                >
                    {updatePending ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                        <Save className="h-3 w-3 mr-1" />
                    )}
                    {t('paperSetup.subSteps.rubric.actions.save')}
                </Button>
            </footer>

                </>
            )}

            <ConfirmActionDialog
                open={confirmResetOpen}
                onOpenChange={setConfirmResetOpen}
                title={t('paperSetup.subSteps.rubric.actions.resetConfirmTitle')}
                body={t('paperSetup.subSteps.rubric.actions.resetConfirmBody')}
                confirmLabel={t('paperSetup.subSteps.rubric.actions.resetConfirmCta')}
                cancelLabel={t('setup.cancel')}
                onConfirm={doReset}
            />
        </div>
    );
}

// ── Summary view (default) ─────────────────────────────────────────────
//
// Compact read-only digest of the paper's current rubric. Lands as
// the default mode of the editor — most students just want to see
// what's there, NOT immediately fill out a 13-field form. Edit kicks
// in only when the student clicks "Editar rúbrica".
//
// Sections rendered:
//   - Provenance + last-updated badge
//   - Title + description (when present)
//   - Citation standard + expected length
//   - Requirements as compact list (type · count · justification)
//   - Structural recommendations summary
//   - Footer actions: Editar rúbrica + Resetear al default

function RubricSummaryView({
    paper,
    rubric,
    onEdit,
    onReset,
    resetPending,
}: {
    paper: ExegeticalPaper;
    rubric: PaperRubric;
    onEdit: () => void;
    onReset: () => void;
    resetPending: boolean;
}) {
    const { t } = useTranslation('exegesis');
    const visibleRequirements = rubric.sourceRequirements.filter(r => r.minimum > 0);
    const optionalRequirements = rubric.sourceRequirements.filter(r => r.minimum === 0);

    return (
        <section className="rounded-lg border border-border bg-card p-5 space-y-4">
            <header className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-foreground">
                        {t('paperSetup.subSteps.rubric.heading')}
                    </h3>
                    {rubric.description && (
                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                            {rubric.description}
                        </p>
                    )}
                </div>
                <Button
                    type="button"
                    onClick={onEdit}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs shrink-0"
                >
                    <Pencil className="h-3 w-3 mr-1" />
                    {t('paperSetup.subSteps.rubric.summary.editCta')}
                </Button>
            </header>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <SummaryField
                    label={t('paperSetup.subSteps.rubric.metadata.citationStandardLabel')}
                    value={summarizeCitationStandard(rubric, paper)}
                />
                <SummaryField
                    label={t('paperSetup.subSteps.rubric.metadata.lengthLabel')}
                    value={summarizeLength(rubric, t)}
                />
            </dl>

            <div className="space-y-1.5">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t('paperSetup.subSteps.rubric.summary.requirementsTitle')}
                </h4>
                {visibleRequirements.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                        {t('paperSetup.subSteps.rubric.requirements.empty')}
                    </p>
                ) : (
                    <ul className="space-y-1.5">
                        {visibleRequirements.map(r => (
                            <SummaryRequirementRow key={r.sourceType} requirement={r} />
                        ))}
                    </ul>
                )}
                {optionalRequirements.length > 0 && (
                    <p className="text-[11px] text-muted-foreground italic mt-2">
                        {t('paperSetup.subSteps.rubric.summary.optionalCount', {
                            count: optionalRequirements.length,
                        })}
                    </p>
                )}
            </div>

            <div className="space-y-1.5">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t('paperSetup.subSteps.rubric.summary.structuralTitle')}
                </h4>
                <ul className="space-y-1.5">
                    {(['introduction', 'verse', 'conclusion'] as const).map(section => {
                        const exp = rubric.structuralExpectations.find(e => e.section === section);
                        return (
                            <li key={section} className="text-xs text-foreground">
                                <span className="font-medium">
                                    {t(`paperSetup.subSteps.rubric.structural.section.${section}`)}:
                                </span>{' '}
                                <span className="text-muted-foreground">
                                    {exp && exp.emphasizedTypes.length > 0
                                        ? exp.emphasizedTypes.map(typ => t(`sourceTypes.${typ}.label`)).join(', ')
                                        : t('paperSetup.subSteps.rubric.structural.noExpectation')}
                                </span>
                            </li>
                        );
                    })}
                </ul>
            </div>

            <footer className="flex items-center justify-end pt-3 border-t border-border">
                <Button
                    type="button"
                    variant="ghost"
                    onClick={onReset}
                    disabled={resetPending}
                    className="text-xs"
                >
                    {resetPending ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                        <RotateCcw className="h-3 w-3 mr-1" />
                    )}
                    {t('paperSetup.subSteps.rubric.actions.reset')}
                </Button>
            </footer>
        </section>
    );
}

function SummaryField({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div>
            <dt className="text-[11px] uppercase tracking-wide text-muted-foreground mb-0.5">{label}</dt>
            <dd className="text-foreground">{value}</dd>
        </div>
    );
}

function SummaryRequirementRow({ requirement }: { requirement: SourceRequirement }) {
    const { t } = useTranslation('exegesis');
    return (
        <li className="text-xs">
            <div className="flex items-baseline gap-2">
                <span className="font-medium text-foreground">
                    {t(`sourceTypes.${requirement.sourceType}.label`)}
                </span>
                <span className="text-muted-foreground text-[11px]">
                    {requirement.maximum
                        ? `${requirement.minimum}–${requirement.maximum}`
                        : `≥ ${requirement.minimum}`}
                </span>
            </div>
            {requirement.justification && (
                <p className="text-[11px] text-muted-foreground italic leading-snug mt-0.5">
                    {requirement.justification}
                </p>
            )}
        </li>
    );
}

function summarizeCitationStandard(rubric: PaperRubric, _paper: ExegeticalPaper): string {
    if (rubric.citationStandard?.trim()) return rubric.citationStandard.trim();
    return '—';
}

function summarizeLength(rubric: PaperRubric, t: (key: string) => string): string {
    if (!rubric.expectedLength) return '—';
    const { unit, min, max } = rubric.expectedLength;
    const unitLabel = unit === 'words'
        ? t('paperSetup.subSteps.rubric.metadata.lengthUnitWords')
        : t('paperSetup.subSteps.rubric.metadata.lengthUnitPages');
    if (min !== null && max !== null) return `${min}–${max} ${unitLabel.toLowerCase()}`;
    if (min !== null) return `≥ ${min} ${unitLabel.toLowerCase()}`;
    if (max !== null) return `≤ ${max} ${unitLabel.toLowerCase()}`;
    return '—';
}

// ── Extract-from-text panel ────────────────────────────────────────────

interface RubricExtractFromTextPanelProps {
    paper: ExegeticalPaper;
    /**
     * Called after a successful, high-confidence extraction. Lets the
     * caller close the surrounding dialog. Low-confidence or
     * has-review-notes results stay open so the student can read them
     * before dismissing.
     */
    onExtracted?: () => void;
}

interface ExtractionResultSummary {
    confidence: 'high' | 'medium' | 'low';
    reviewNotes: ReadonlyArray<string>;
}

function RubricExtractFromTextPanel({ paper, onExtracted }: RubricExtractFromTextPanelProps) {
    const { t } = useTranslation('exegesis');
    const { extractRubricFromText } = useExegesisPapers();
    const [text, setText] = useState('');
    // Output language defaults to the paper's display language so the
    // extracted rubric's justifications match the language the student
    // will read during setup. Override when the student is producing a
    // paper in a different language than the rubric source.
    const [outputLanguage, setOutputLanguage] = useState<'es' | 'en'>(paper.displayLanguage);
    const [lastResult, setLastResult] = useState<ExtractionResultSummary | null>(null);

    const isExtracting = extractRubricFromText.isPending;
    const trimmedLength = text.trim().length;
    const canSubmit = trimmedLength >= 30 && !isExtracting;
    const [confirmReplaceOpen, setConfirmReplaceOpen] = useState(false);

    const handleExtract = () => {
        if (!canSubmit) return;
        // The rubric being replaced may already carry user edits; the
        // confirm makes that explicit instead of silently nuking work.
        if (paper.rubric && paper.rubric.provenance === 'user-edited') {
            setConfirmReplaceOpen(true);
            return;
        }
        void doExtract();
    };

    const doExtract = async () => {
        setConfirmReplaceOpen(false);
        try {
            const result = await extractRubricFromText.mutateAsync({
                paperId: paper.id,
                rawText: text.trim(),
                language: outputLanguage,
            });
            setLastResult({
                confidence: result.confidence,
                reviewNotes: result.reviewNotes,
            });
            // Keep the text in the textarea so the student can re-extract
            // after editing the source — they often refine and retry.
            toast.success(t('paperSetup.subSteps.rubric.extract.success'));
            // Close the dialog only when the result is high confidence
            // and there are no review notes — otherwise the user wants
            // to read the result card before dismissing.
            if (onExtracted && result.confidence === 'high' && result.reviewNotes.length === 0) {
                onExtracted();
            }
        } catch (err) {
            console.error('[exegesis] extract rubric failed:', err);
            // The infrastructure layer tags Gemini 503/429 errors as
            // OverloadedError (via the `isExegesisOverload` marker on
            // the thrown instance). Surface the transient nature so the
            // student doesn't think their text is the problem.
            const isOverload = (err as { isExegesisOverload?: boolean })?.isExegesisOverload === true;
            toast.error(isOverload
                ? t('paperSetup.subSteps.rubric.extract.overloaded')
                : t('paperSetup.subSteps.rubric.extract.failed'),
            );
        }
    };

    return (
        <div className="space-y-3">
            <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                    {t('paperSetup.subSteps.rubric.extract.textareaLabel')}
                </label>
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={t('paperSetup.subSteps.rubric.extract.textareaPlaceholder')}
                    rows={6}
                    disabled={isExtracting}
                    className="w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary resize-y disabled:opacity-50"
                />
                {trimmedLength > 0 && trimmedLength < 30 && (
                    <p className="text-[11px] text-warning-subtle-foreground mt-1 inline-flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {t('paperSetup.subSteps.rubric.extract.tooShort')}
                    </p>
                )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2">
                    <label className="text-[11px] font-medium text-foreground">
                        {t('paperSetup.subSteps.rubric.extract.outputLanguageLabel')}
                    </label>
                    <select
                        value={outputLanguage}
                        onChange={(e) => setOutputLanguage(e.target.value as 'es' | 'en')}
                        disabled={isExtracting}
                        className="rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:opacity-50"
                    >
                        <option value="es">Español</option>
                        <option value="en">English</option>
                    </select>
                    <span className="text-[10px] text-muted-foreground italic">
                        {t('paperSetup.subSteps.rubric.extract.outputLanguageHint')}
                    </span>
                </div>
                <Button
                    type="button"
                    onClick={handleExtract}
                    disabled={!canSubmit}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
                >
                    {isExtracting ? (
                        <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            {t('paperSetup.subSteps.rubric.extract.extracting')}
                        </>
                    ) : (
                        <>
                            <Sparkles className="h-3 w-3 mr-1" />
                            {t('paperSetup.subSteps.rubric.extract.submit')}
                        </>
                    )}
                </Button>
            </div>

            {lastResult && <ExtractionResultCard result={lastResult} />}

            <ConfirmActionDialog
                open={confirmReplaceOpen}
                onOpenChange={setConfirmReplaceOpen}
                title={t('paperSetup.subSteps.rubric.extract.confirmReplaceTitle')}
                body={t('paperSetup.subSteps.rubric.extract.confirmReplaceBody')}
                confirmLabel={t('paperSetup.subSteps.rubric.extract.confirmReplaceCta')}
                cancelLabel={t('setup.cancel')}
                onConfirm={doExtract}
            />
        </div>
    );
}

function ExtractionResultCard({ result }: { result: ExtractionResultSummary }) {
    const { t } = useTranslation('exegesis');
    const confidenceLabel = t(`paperSetup.subSteps.rubric.extract.confidence${capitalize(result.confidence)}` as any);
    const confidenceHint = t(`paperSetup.subSteps.rubric.extract.confidenceHint.${result.confidence}` as any);
    const tone = result.confidence === 'low'
        ? 'bg-warning-subtle border-warning/30 text-warning-subtle-foreground'
        : result.confidence === 'medium'
            ? 'bg-info-subtle border-info/30 text-info-subtle-foreground'
            : 'bg-success-subtle border-success/30 text-success-subtle-foreground';

    return (
        <div className={`rounded-md border ${tone} p-3 space-y-1.5`}>
            <p className="text-xs font-semibold inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {confidenceLabel}
            </p>
            <p className="text-[11px] leading-snug">{confidenceHint}</p>
            {result.reviewNotes.length > 0 && (
                <details className="text-[11px]">
                    <summary className="cursor-pointer font-medium">
                        {t('paperSetup.subSteps.rubric.extract.reviewNotesTitle')} ({result.reviewNotes.length})
                    </summary>
                    <ul className="list-disc pl-4 mt-1 space-y-0.5">
                        {result.reviewNotes.map((n, i) => (
                            <li key={i}>{n}</li>
                        ))}
                    </ul>
                </details>
            )}
        </div>
    );
}

function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Templates panel ────────────────────────────────────────────────────
//
// Bridges the paper-embedded rubric to the user-level template
// library. Two affordances:
//   1. **Apply template** — pick a saved template and copy its
//      content into `paper.rubric` (overwriting). Confirms when the
//      current rubric was user-edited so manual tweaks aren't
//      silently lost.
//   2. **Save current as template** — snapshot `paper.rubric` into
//      a new `UserRubric` for reuse on future papers.
//
// When the user has no templates yet, the panel collapses to a
// single "Save current as template" CTA — applying nothing is a
// no-op so we don't surface an empty picker.

function RubricTemplatesPanel({ paper }: { paper: ExegeticalPaper }) {
    const { t } = useTranslation('exegesis');
    const { rubrics, applyTemplate, saveAsTemplate } = useUserRubrics();
    // Pre-select the dropdown to whatever template the paper's rubric
    // came from (set by ApplyRubricTemplateToPaperUseCase /
    // SaveCurrentRubricAsTemplateUseCase / CreateExegeticalPaperUseCase).
    // Re-syncs whenever the rubric changes server-side so a fresh apply
    // / extract / reset reflects accurately. The value falls back to ''
    // when the rubric has no template origin (default, extracted,
    // or the original template was deleted).
    const currentTemplateId = paper.rubric?.sourceTemplateId ?? null;
    const templateStillExists = currentTemplateId !== null && rubrics.some(r => r.id === currentTemplateId);
    const initialPickerValue = templateStillExists ? currentTemplateId! : '';
    const [pickerValue, setPickerValue] = useState(initialPickerValue);
    useEffect(() => {
        setPickerValue(initialPickerValue);
    }, [initialPickerValue]);
    // Tracks the templateId most recently applied successfully in
    // this session so we can show the "✓ Aplicada" badge + disable
    // the Apply button when the picker matches. Seeded with the
    // current templateId so the freshly-loaded "this is what's
    // applied" state shows the badge from the start.
    const [lastAppliedId, setLastAppliedId] = useState<string | null>(currentTemplateId);
    useEffect(() => {
        setLastAppliedId(currentTemplateId);
    }, [currentTemplateId]);
    const [savingMode, setSavingMode] = useState(false);
    const [templateName, setTemplateName] = useState('');
    const [confirmApplyOpen, setConfirmApplyOpen] = useState(false);

    const handleApply = () => {
        if (!pickerValue) return;
        // The current rubric carries user edits — confirm before
        // overwriting. Otherwise apply directly.
        if (paper.rubric?.provenance === 'user-edited') {
            setConfirmApplyOpen(true);
            return;
        }
        void doApply();
    };

    const doApply = async () => {
        setConfirmApplyOpen(false);
        try {
            await applyTemplate.mutateAsync({ paperId: paper.id, rubricTemplateId: pickerValue });
            toast.success(t('paperSetup.subSteps.rubric.templates.applied'));
            // Keep the picker value — clearing felt to the user like
            // the apply silently cancelled. Mark this id as just-
            // applied so the Apply button shows ✓ Aplicada and
            // disables until they pick something else.
            setLastAppliedId(pickerValue);
        } catch (err) {
            console.error('[exegesis] apply template failed:', err);
            toast.error(t('paperSetup.subSteps.rubric.templates.applyFailed'));
        }
    };

    const justApplied = pickerValue !== '' && pickerValue === lastAppliedId;

    const handleSave = async () => {
        const name = templateName.trim();
        if (!name) {
            toast.error(t('paperSetup.subSteps.rubric.templates.nameRequired'));
            return;
        }
        try {
            await saveAsTemplate.mutateAsync({ paperId: paper.id, displayName: name });
            toast.success(t('paperSetup.subSteps.rubric.templates.saved'));
            setSavingMode(false);
            setTemplateName('');
        } catch (err) {
            console.error('[exegesis] save as template failed:', err);
            toast.error(t('paperSetup.subSteps.rubric.templates.saveFailed'));
        }
    };

    return (
        <section className="rounded-lg border border-border bg-muted/40 p-4 space-y-3">
            <header>
                <h3 className="text-sm font-semibold text-foreground">
                    {t('paperSetup.subSteps.rubric.templates.title')}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                    {t('paperSetup.subSteps.rubric.templates.subtitle')}
                </p>
            </header>

            {rubrics.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-end gap-2">
                    <div className="flex-1 min-w-0">
                        <label className="block text-[11px] font-medium text-foreground mb-1">
                            {t('paperSetup.subSteps.rubric.templates.applyLabel')}
                        </label>
                        <select
                            value={pickerValue}
                            onChange={(e) => {
                                setPickerValue(e.target.value);
                                // Switching templates re-arms the
                                // Apply button (the new selection
                                // hasn't been applied yet).
                                if (e.target.value !== lastAppliedId) {
                                    setLastAppliedId(prev => prev === e.target.value ? prev : null);
                                }
                            }}
                            disabled={applyTemplate.isPending}
                            className="w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:opacity-50"
                        >
                            <option value="">— {t('paperSetup.subSteps.rubric.templates.applyPlaceholder')} —</option>
                            {rubrics.map(r => (
                                <option key={r.id} value={r.id}>
                                    {r.displayName}{r.isDefault ? ' (★)' : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                    <Button
                        type="button"
                        onClick={handleApply}
                        disabled={!pickerValue || applyTemplate.isPending || justApplied}
                        className={justApplied
                            ? 'bg-success-subtle text-success-subtle-foreground border border-success/30 text-xs cursor-default'
                            : 'bg-primary hover:bg-primary/90 text-primary-foreground text-xs'
                        }
                    >
                        {applyTemplate.isPending ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : justApplied ? (
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                        ) : null}
                        {justApplied
                            ? t('paperSetup.subSteps.rubric.templates.appliedBadge')
                            : t('paperSetup.subSteps.rubric.templates.applyCta')}
                    </Button>
                </div>
            )}

            {!savingMode ? (
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
                    <p className="text-[11px] text-muted-foreground">
                        {rubrics.length === 0
                            ? t('paperSetup.subSteps.rubric.templates.emptyHint')
                            : t('paperSetup.subSteps.rubric.templates.saveHint')}
                    </p>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setSavingMode(true)}
                        className="text-xs"
                    >
                        <Save className="h-3 w-3 mr-1" />
                        {t('paperSetup.subSteps.rubric.templates.saveCta')}
                    </Button>
                </div>
            ) : (
                <div className="flex flex-col sm:flex-row sm:items-end gap-2 pt-2 border-t border-border">
                    <div className="flex-1 min-w-0">
                        <label className="block text-[11px] font-medium text-foreground mb-1">
                            {t('paperSetup.subSteps.rubric.templates.namePromptLabel')}
                        </label>
                        <input
                            type="text"
                            autoFocus
                            value={templateName}
                            onChange={(e) => setTemplateName(e.target.value)}
                            placeholder={t('paperSetup.subSteps.rubric.templates.namePromptPlaceholder')}
                            disabled={saveAsTemplate.isPending}
                            className="w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:opacity-50"
                        />
                    </div>
                    <div className="flex gap-1.5">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                                setSavingMode(false);
                                setTemplateName('');
                            }}
                            disabled={saveAsTemplate.isPending}
                            className="text-xs"
                        >
                            {t('setup.cancel')}
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSave}
                            disabled={saveAsTemplate.isPending}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
                        >
                            {saveAsTemplate.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                            {t('paperSetup.subSteps.rubric.templates.saveConfirm')}
                        </Button>
                    </div>
                </div>
            )}

            <ConfirmActionDialog
                open={confirmApplyOpen}
                onOpenChange={setConfirmApplyOpen}
                title={t('paperSetup.subSteps.rubric.templates.applyConfirmTitle')}
                body={t('paperSetup.subSteps.rubric.templates.applyConfirmBody')}
                confirmLabel={t('paperSetup.subSteps.rubric.templates.applyConfirmCta')}
                cancelLabel={t('setup.cancel')}
                onConfirm={doApply}
            />
        </section>
    );
}

// ── CitationStandardField ──────────────────────────────────────────────
//
// The citation standard for the paper has TWO sources of truth:
//   1. The active style guide's manifest (what the user actually
//      uploaded) — `manifest.citationStyleLabel`. This is the
//      DEFAULT for any paper that pins this guide.
//   2. The rubric's `citationStandard` field — only set when the
//      seminary's rubric explicitly requires a different standard
//      than the user's guide (rare but real, e.g. one paper
//      requires SBL while the rest of the user's seminary work is
//      Turabian).
//
// The field renders the guide's value as a read-only badge, plus a
// presets dropdown ("Match guide" / Turabian 9 / SBL Handbook /
// Chicago 17 / MLA 9 / APA 7 / Other...) for the override case.
// "Match guide" stores `null` so generation uses the guide's
// standard — no value duplication.

const CITATION_PRESETS = [
    'TMS / Turabian',
    'Turabian 9',
    'SBL Handbook',
    'Chicago 17',
    'MLA 9',
    'APA 7',
] as const;

function CitationStandardField({
    paper,
    value,
    onChange,
}: {
    paper: ExegeticalPaper;
    value: string;
    onChange: (next: string) => void;
}) {
    const { t } = useTranslation('exegesis');
    const { guides, activeGuide } = useUserStyleGuides();

    // Resolve the same guide the manifest viewer would show.
    const guide = paper.styleGuideId
        ? guides.find(g => g.id === paper.styleGuideId) ?? null
        : activeGuide;
    const guideStandard = guide?.manifest?.citationStyleLabel ?? null;

    const isMatchingGuide = value.trim() === '' || (guideStandard !== null && value.trim() === guideStandard.trim());
    const showMismatch = !isMatchingGuide && guideStandard !== null;

    // Mode: 'guide' = no override (value === ''), 'preset' = picked
    // from the preset list, 'custom' = typing free text.
    const inPresets = CITATION_PRESETS.includes(value as typeof CITATION_PRESETS[number]);
    const initialMode: 'guide' | 'preset' | 'custom' = value === ''
        ? 'guide'
        : inPresets ? 'preset' : 'custom';
    const [mode, setMode] = useState<'guide' | 'preset' | 'custom'>(initialMode);

    return (
        <div>
            <label className="block text-xs font-medium text-foreground mb-1">
                {t('paperSetup.subSteps.rubric.metadata.citationStandardLabel')}
            </label>

            {guideStandard && (
                <div className="mb-2 inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground">
                        {t('paperSetup.subSteps.rubric.metadata.fromGuide')}:
                    </span>
                    <span>{guideStandard}</span>
                </div>
            )}

            <select
                value={mode}
                onChange={(e) => {
                    const next = e.target.value as 'guide' | 'preset' | 'custom';
                    setMode(next);
                    if (next === 'guide') onChange('');
                    else if (next === 'preset') onChange(CITATION_PRESETS[0]);
                    // 'custom' keeps existing value so the user can edit
                }}
                className="w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            >
                <option value="guide">
                    {guideStandard
                        ? t('paperSetup.subSteps.rubric.metadata.matchGuide', { standard: guideStandard })
                        : t('paperSetup.subSteps.rubric.metadata.matchGuideNoGuide')}
                </option>
                <option value="preset">{t('paperSetup.subSteps.rubric.metadata.pickPreset')}</option>
                <option value="custom">{t('paperSetup.subSteps.rubric.metadata.custom')}</option>
            </select>

            {mode === 'preset' && (
                <select
                    value={inPresets ? value : CITATION_PRESETS[0]}
                    onChange={(e) => onChange(e.target.value)}
                    className="mt-2 w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                >
                    {CITATION_PRESETS.map(preset => (
                        <option key={preset} value={preset}>{preset}</option>
                    ))}
                </select>
            )}

            {mode === 'custom' && (
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={t('paperSetup.subSteps.rubric.metadata.citationStandardPlaceholder')}
                    className="mt-2 w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                />
            )}

            {showMismatch && mode !== 'guide' && (
                <p className="mt-2 text-[11px] text-warning-subtle-foreground bg-warning-subtle border border-warning/30 rounded px-2 py-1">
                    ⚠ {t('paperSetup.subSteps.rubric.metadata.mismatchWarning', { rubric: value, guide: guideStandard })}
                </p>
            )}
        </div>
    );
}

// ── Reusable confirm dialog ────────────────────────────────────────────
//
// Replaces native window.confirm for destructive actions (apply
// template, extract-from-text, reset rubric). Uses the AlertDialog
// primitive so the dialog blocks interaction and respects keyboard
// (Esc cancels, Enter confirms). Returning to native confirm would
// undo the visual polish; keep this as the single in-app pattern.

interface ConfirmActionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    body: string;
    confirmLabel: string;
    cancelLabel: string;
    onConfirm: () => void;
    /** When true, renders the confirm button with destructive styling. */
    destructive?: boolean;
}

function ConfirmActionDialog({
    open,
    onOpenChange,
    title,
    body,
    confirmLabel,
    cancelLabel,
    onConfirm,
    destructive = true,
}: ConfirmActionDialogProps) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>{body}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        className={destructive
                            ? 'bg-destructive text-white hover:bg-destructive/90'
                            : undefined
                        }
                    >
                        {confirmLabel}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
