import { useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle,
    CheckCircle2,
    FileCheck2,
    Info,
    Loader2,
    Plus,
    RotateCcw,
    Save,
    Sparkles,
    Trash2,
    Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import {
    SOURCE_TYPE_GROUPS,
    type ExegeticalPaper,
    type PaperRubric,
    type SourceRequirement,
    type SourceType,
} from '@dosfilos/domain';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n';
import { useExegesisPapers } from '@/hooks/exegesis/useExegesisPapers';

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
    const { updateRubric, resetRubric } = useExegesisPapers();
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

    return <RubricEditor paper={paper} rubric={rubric} updatePending={updateRubric.isPending} resetPending={resetRubric.isPending} />;
}

// ── Editor ─────────────────────────────────────────────────────────────

interface RubricEditorProps {
    paper: ExegeticalPaper;
    rubric: PaperRubric;
    updatePending: boolean;
    resetPending: boolean;
}

function RubricEditor({ paper, rubric, updatePending, resetPending }: RubricEditorProps) {
    const { t } = useTranslation('exegesis');
    const { updateRubric, resetRubric } = useExegesisPapers();

    // Form state seeded from the persisted rubric. Re-syncs whenever
    // the persisted rubric reference changes (e.g. another tab saved
    // or reset). In-flight edits are lost on those events — that's
    // acceptable for v1 since concurrent multi-tab editing is rare.
    const [title, setTitle] = useState<string>(rubric.title ?? '');
    const [description, setDescription] = useState<string>(rubric.description ?? '');
    const [citationStandard, setCitationStandard] = useState<string>(rubric.citationStandard ?? '');
    const [lengthUnit, setLengthUnit] = useState<'pages' | 'words'>(rubric.expectedLength?.unit ?? 'pages');
    const [lengthMin, setLengthMin] = useState<string>(rubric.expectedLength?.min?.toString() ?? '');
    const [lengthMax, setLengthMax] = useState<string>(rubric.expectedLength?.max?.toString() ?? '');
    const [requirements, setRequirements] = useState<SourceRequirement[]>([...rubric.sourceRequirements]);

    useEffect(() => {
        setTitle(rubric.title ?? '');
        setDescription(rubric.description ?? '');
        setCitationStandard(rubric.citationStandard ?? '');
        setLengthUnit(rubric.expectedLength?.unit ?? 'pages');
        setLengthMin(rubric.expectedLength?.min?.toString() ?? '');
        setLengthMax(rubric.expectedLength?.max?.toString() ?? '');
        setRequirements([...rubric.sourceRequirements]);
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
                title: title.trim() || null,
                description: description.trim() || null,
                citationStandard: citationStandard.trim() || null,
                expectedLength,
                sourceRequirements: requirements,
            });
            toast.success(t('paperSetup.subSteps.rubric.actions.saved'));
        } catch (err) {
            console.error('[exegesis] save rubric failed:', err);
            toast.error(t('paperSetup.subSteps.rubric.actions.saveFailed'));
        }
    };

    const handleReset = async () => {
        if (!window.confirm(t('paperSetup.subSteps.rubric.actions.resetConfirm'))) return;
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
            </header>

            <div className="rounded-md bg-info-subtle border border-info/30 px-3 py-2 flex items-start gap-2">
                <Upload className="h-3.5 w-3.5 text-info mt-0.5 shrink-0" />
                <p className="text-[11px] text-info-subtle-foreground leading-snug">
                    {t('paperSetup.subSteps.rubric.uploadComingSoon')}
                </p>
            </div>

            <RubricExtractFromTextPanel paper={paper} />

            {/* ── Metadata ── */}
            <section className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">
                    {t('paperSetup.subSteps.rubric.metadata.title')}
                </h3>
                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-medium text-foreground mb-1">
                            {t('paperSetup.subSteps.rubric.metadata.titleLabel')}
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={t('paperSetup.subSteps.rubric.metadata.titlePlaceholder')}
                            className="w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                        />
                    </div>
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
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
                        <div>
                            <label className="block text-xs font-medium text-foreground mb-1">
                                {t('paperSetup.subSteps.rubric.metadata.citationStandardLabel')}
                            </label>
                            <input
                                type="text"
                                value={citationStandard}
                                onChange={(e) => setCitationStandard(e.target.value)}
                                placeholder={t('paperSetup.subSteps.rubric.metadata.citationStandardPlaceholder')}
                                className="w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                            />
                        </div>
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
                    onClick={handleReset}
                    disabled={resetPending}
                    className="text-xs"
                >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    {t('paperSetup.subSteps.rubric.actions.reset')}
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
        </div>
    );
}

// ── Extract-from-text panel ────────────────────────────────────────────

interface RubricExtractFromTextPanelProps {
    paper: ExegeticalPaper;
}

interface ExtractionResultSummary {
    confidence: 'high' | 'medium' | 'low';
    reviewNotes: ReadonlyArray<string>;
}

function RubricExtractFromTextPanel({ paper }: RubricExtractFromTextPanelProps) {
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

    const handleExtract = async () => {
        if (!canSubmit) return;
        // The rubric being replaced may already carry user edits; the
        // confirm makes that explicit instead of silently nuking work.
        if (paper.rubric && paper.rubric.provenance === 'user-edited') {
            if (!window.confirm(t('paperSetup.subSteps.rubric.extract.confirmReplace'))) return;
        }
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
        <section className="rounded-lg border border-success/30 bg-success-subtle p-4 space-y-3">
            <header className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-success mt-0.5 shrink-0" />
                <div>
                    <h3 className="text-sm font-semibold text-success-subtle-foreground">
                        {t('paperSetup.subSteps.rubric.extract.title')}
                    </h3>
                    <p className="text-xs text-success-subtle-foreground mt-0.5">
                        {t('paperSetup.subSteps.rubric.extract.subtitle')}
                    </p>
                </div>
            </header>

            <div>
                <label className="block text-xs font-medium text-success-subtle-foreground mb-1">
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
                    <label className="text-[11px] font-medium text-success-subtle-foreground">
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
                    <span className="text-[10px] text-success-subtle-foreground italic">
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
        </section>
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

// ── Per-row sub-components ─────────────────────────────────────────────

interface RequirementRowProps {
    requirement: SourceRequirement;
    onChange: (patch: Partial<SourceRequirement>) => void;
    onRemove: () => void;
}

function RequirementRow({ requirement, onChange, onRemove }: RequirementRowProps) {
    const { t } = useTranslation('exegesis');
    return (
        <li className="rounded-lg border border-border bg-card p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                        {t(`sourceTypes.${requirement.sourceType}.label`)}
                    </p>
                    <p className="text-[11px] text-muted-foreground italic">
                        {t(`sourceTypes.${requirement.sourceType}.examples`)}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onRemove}
                    className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-accent transition-colors"
                    aria-label={t('paperSetup.subSteps.rubric.requirements.removeRequirement')}
                    title={t('paperSetup.subSteps.rubric.requirements.removeRequirement')}
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="block text-[11px] font-medium text-muted-foreground mb-0.5">
                        {t('paperSetup.subSteps.rubric.requirements.minLabel')}
                    </label>
                    <input
                        type="number"
                        min={0}
                        value={requirement.minimum}
                        onChange={(e) => onChange({ minimum: Math.max(0, Number(e.target.value || 0)) })}
                        className="w-full rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    />
                </div>
                <div>
                    <label className="block text-[11px] font-medium text-muted-foreground mb-0.5">
                        {t('paperSetup.subSteps.rubric.requirements.maxLabel')}
                    </label>
                    <input
                        type="number"
                        min={0}
                        value={requirement.maximum ?? ''}
                        onChange={(e) => {
                            const v = e.target.value;
                            onChange({ maximum: v === '' ? null : Math.max(0, Number(v)) });
                        }}
                        placeholder={t('paperSetup.subSteps.rubric.requirements.maxUnlimited')}
                        className="w-full rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    />
                </div>
            </div>
            <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-0.5">
                    {t('paperSetup.subSteps.rubric.requirements.justificationLabel')}
                </label>
                <textarea
                    value={requirement.justification}
                    onChange={(e) => onChange({ justification: e.target.value })}
                    placeholder={t('paperSetup.subSteps.rubric.requirements.justificationPlaceholder')}
                    rows={2}
                    className="w-full rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary resize-y"
                />
            </div>
        </li>
    );
}

interface AddRequirementButtonProps {
    availableTypes: ReadonlyArray<SourceType>;
    onAdd: (type: SourceType) => void;
}

function AddRequirementButton({ availableTypes, onAdd }: AddRequirementButtonProps) {
    const { t } = useTranslation('exegesis');
    const [picking, setPicking] = useState(false);

    if (availableTypes.length === 0) {
        return (
            <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                <Info className="h-3 w-3" />
                {/* All types already have a requirement; nothing to add */}
                {t('paperSetup.subSteps.rubric.requirements.duplicateError')}
            </p>
        );
    }

    if (!picking) {
        return (
            <button
                type="button"
                onClick={() => setPicking(true)}
                className="inline-flex items-center gap-1 text-xs text-success hover:text-success-subtle-foreground"
            >
                <Plus className="h-3 w-3" />
                {t('paperSetup.subSteps.rubric.requirements.addRequirement')}
            </button>
        );
    }

    return (
        <select
            autoFocus
            onChange={(e) => {
                const v = e.target.value as SourceType;
                if (v) {
                    onAdd(v);
                    setPicking(false);
                }
            }}
            onBlur={() => setPicking(false)}
            className="rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
            <option value="">— {t('paperSetup.subSteps.rubric.requirements.addRequirement')} —</option>
            {SOURCE_TYPE_GROUPS.map(group => {
                const groupAvailable = group.types.filter(typ => availableTypes.includes(typ as SourceType)) as ReadonlyArray<SourceType>;
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
    );
}
