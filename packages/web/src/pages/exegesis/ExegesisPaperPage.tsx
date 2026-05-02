import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
    ArrowLeft,
    AlertCircle,
    Download,
    Loader2,
    Archive,
    NotebookPen,
    FileCheck2,
    FileStack,
    Wand2,
    Settings2,
    Pencil,
    X,
    BookOpenText,
    BookOpen,
    Mic,
    MessageCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTranslation } from '@/i18n';
import { useExegesisPapers } from '@/hooks/exegesis/useExegesisPapers';
import { useUserRubrics } from '@/hooks/exegesis/useUserRubrics';
import { useUserStyleGuides } from '@/hooks/exegesis/useUserStyleGuides';
import { StepCard } from '@/components/exegesis/StepCard';
import {
    exportPaperToMarkdown,
    formatPassageReference,
    type ExegeticalPaper,
    type PaperToSermonTone,
    type ProjectSource,
    type SupportedLanguage,
} from '@dosfilos/domain';

/**
 * Detail view for a single exegetical paper.
 *
 * v1 thin slice: shows the paper's configuration (passage, style guide,
 * sources) and a "steps" panel that's empty until the orchestrator
 * (D) lands. Source removal is wired so the user can fix mistakes
 * after creation; adding new sources from this page and changing the
 * style guide are flagged as v1.5 and surfaced as locked actions —
 * better than hiding the gap.
 */
export function ExegesisPaperPage() {
    const { paperId } = useParams<{ paperId: string }>();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation('exegesis');
    const activeLanguage: SupportedLanguage = i18n.language?.split('-')[0] === 'en' ? 'en' : 'es';

    const {
        papers,
        isLoading,
        error,
        archivePaper,
        removeSource,
        seedSteps,
        generateSermonFromPaper,
    } = useExegesisPapers();
    const paper: ExegeticalPaper | null = papers.find(p => p.id === paperId) ?? null;

    if (isLoading) {
        return <CenteredMessage icon={<Loader2 className="h-5 w-5 animate-spin" />} text={t('detail.loading')} />;
    }
    if (error) {
        return <CenteredMessage icon={<AlertCircle className="h-5 w-5" />} text={t('list.loadFailed')} tone="error" />;
    }
    if (!paper) {
        return <NotFound />;
    }

    const handleArchive = async () => {
        try {
            await archivePaper.mutateAsync({ paperId: paper.id, archived: true });
            toast.success(t('detail.toast.archived'));
            navigate('/dashboard/exegesis');
        } catch (err) {
            console.error('[exegesis] archive failed:', err);
            toast.error(t('detail.toast.archiveFailed'));
        }
    };

    const handleRemoveSource = async (sourceId: string) => {
        try {
            await removeSource.mutateAsync({ paperId: paper.id, sourceId });
            toast.success(t('detail.toast.sourceRemoved'));
        } catch (err) {
            console.error('[exegesis] removeSource failed:', err);
            toast.error(t('detail.toast.sourceRemoveFailed'));
        }
    };

    const handleGenerateSermon = async (tone: PaperToSermonTone) => {
        try {
            const result = await generateSermonFromPaper.mutateAsync({
                paperId: paper.id,
                tone,
            });
            toast.success(t('detail.generateSermon.toast.success'));
            navigate(`/dashboard/sermons/${result.sermonId}`);
        } catch (err: any) {
            console.error('[exegesis] generateSermonFromPaper failed:', err);
            const msg = err?.isExegesisOverload
                ? t('detail.generateSermon.toast.overloaded')
                : t('detail.generateSermon.toast.failed');
            toast.error(msg);
        }
    };

    const handleStartGeneration = async () => {
        try {
            await seedSteps.mutateAsync({ paperId: paper.id });
            toast.success(t('detail.steps.toast.seeded'));
        } catch (err: any) {
            console.error('[exegesis] seedSteps failed:', err);
            // Surface the repo's specific error (e.g. "v1 only supports
            // single-chapter passages") so the user knows how to fix it.
            const msg = err?.message?.includes('single-chapter') || err?.message?.includes('explicit verses')
                ? t('detail.steps.toast.seedShapeError')
                : t('detail.steps.toast.seedFailed');
            toast.error(msg);
        }
    };

    const handleExportMarkdown = () => {
        const markdown = exportPaperToMarkdown(paper);
        const safeTitle = (paper.title || formatPassageReference(paper.passage, activeLanguage))
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 60) || 'paper';
        const filename = `${safeTitle}.md`;
        const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success(t('detail.exportMarkdown.toast.exported'));
    };

    const passageShape = passageEligibleForGeneration(paper);

    const passageDisplay = formatPassageReference(paper.passage, activeLanguage);
    const titleDisplay = paper.title || passageDisplay;

    return (
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-zinc-950/50 font-sans overflow-y-auto">
            {/* Header */}
            <div className="border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-4">
                <div className="max-w-5xl mx-auto flex items-center gap-3">
                    <Link
                        to="/dashboard/exegesis"
                        className="inline-flex items-center justify-center h-8 w-8 rounded-md text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                        aria-label={t('detail.back')}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100 font-serif truncate">
                            {titleDisplay}
                        </h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {passageDisplay} · {t(`list.phase.${paper.phase}`)}
                        </p>
                    </div>
                    <Link
                        to={`/dashboard/exegesis/${paper.id}/setup`}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 h-8 text-xs font-medium text-foreground hover:bg-accent transition-colors"
                    >
                        <Settings2 className="h-3.5 w-3.5" />
                        {t('detail.openSetup')}
                    </Link>
                    <Link
                        to={`/dashboard/faculty/new?paperId=${paper.id}`}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 h-8 text-xs font-medium text-foreground hover:bg-accent transition-colors"
                        title={t('detail.askFaculty.tooltip') as string}
                    >
                        <MessageCircle className="h-3.5 w-3.5" />
                        {t('detail.askFaculty.cta')}
                    </Link>
                    <button
                        type="button"
                        onClick={handleExportMarkdown}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 h-8 text-xs font-medium text-foreground hover:bg-accent transition-colors"
                        title={t('detail.exportMarkdown.tooltip') as string}
                    >
                        <Download className="h-3.5 w-3.5" />
                        {t('detail.exportMarkdown.cta')}
                    </button>
                    <GenerateSermonButton
                        paper={paper}
                        onGenerate={handleGenerateSermon}
                        pending={generateSermonFromPaper.isPending}
                        t={t}
                    />
                    <ArchiveButton onClick={handleArchive} pending={archivePaper.isPending} t={t} />
                </div>
            </div>

            {/* Body */}
            <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
                    <StepsPanel
                        paper={paper}
                        language={activeLanguage}
                        passageEligible={passageShape.eligible}
                        passageHint={passageShape.hint(t)}
                        onStartGeneration={handleStartGeneration}
                        starting={seedSteps.isPending}
                        t={t}
                    />
                    <aside className="space-y-4">
                        <RubricCard paper={paper} t={t} />
                        <StyleGuideCard paper={paper} t={t} />
                        <SourcesCard
                            paper={paper}
                            onRemove={handleRemoveSource}
                            isRemoving={removeSource.isPending}
                            t={t}
                        />
                    </aside>
                </div>
            </main>
        </div>
    );
}

// ── Header pieces ───────────────────────────────────────────────────────

const SERMON_TONES: PaperToSermonTone[] = ['pastoral', 'expositivo', 'narrativo'];

function GenerateSermonButton({
    paper,
    onGenerate,
    pending,
    t,
}: {
    paper: ExegeticalPaper;
    onGenerate: (tone: PaperToSermonTone) => void;
    pending: boolean;
    t: (key: string) => string;
}) {
    const [open, setOpen] = useState(false);
    // Only available once the paper is fully assembled — anything earlier
    // would transform a half-baked draft into a half-baked sermon.
    const enabled = paper.phase === 'assembled' && paper.assembledMarkdown !== null;

    const trigger = (
        <Button
            variant="outline"
            size="sm"
            disabled={!enabled || pending}
            className="text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 disabled:opacity-50"
            title={enabled ? undefined : t('detail.generateSermon.disabledHint')}
        >
            {pending ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
                <Mic className="h-3.5 w-3.5 mr-1.5" />
            )}
            {pending ? t('detail.generateSermon.generating') : t('detail.generateSermon.cta')}
        </Button>
    );

    if (!enabled) return trigger;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>{trigger}</PopoverTrigger>
            <PopoverContent align="end" className="w-72 p-0">
                <div className="px-4 py-3 border-b border-border">
                    <p className="text-sm font-semibold text-foreground">
                        {t('detail.generateSermon.popoverTitle')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                        {t('detail.generateSermon.popoverHint')}
                    </p>
                </div>
                <div className="py-1">
                    {SERMON_TONES.map((tone) => (
                        <button
                            key={tone}
                            type="button"
                            onClick={() => {
                                setOpen(false);
                                onGenerate(tone);
                            }}
                            className="w-full flex flex-col items-start gap-0.5 px-4 py-2.5 text-left hover:bg-accent transition-colors"
                        >
                            <span className="text-sm font-medium text-foreground">
                                {t(`detail.generateSermon.tone.${tone}`)}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                                {t(`detail.generateSermon.tone.${tone}Hint`)}
                            </span>
                        </button>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}

function ArchiveButton({
    onClick,
    pending,
    t,
}: {
    onClick: () => void;
    pending: boolean;
    t: (key: string) => string;
}) {
    const [confirming, setConfirming] = useState(false);
    if (!confirming) {
        return (
            <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirming(true)}
                className="text-slate-600 dark:text-slate-300 border-slate-300 dark:border-zinc-700"
            >
                <Archive className="h-3.5 w-3.5 mr-1.5" />
                {t('detail.archive')}
            </Button>
        );
    }
    return (
        <div className="inline-flex items-center gap-1.5">
            <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirming(false)}
                disabled={pending}
            >
                {t('setup.cancel')}
            </Button>
            <Button
                size="sm"
                onClick={onClick}
                disabled={pending}
                className="bg-rose-500 hover:bg-rose-400 text-white"
            >
                {pending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                {t('detail.archiveConfirm')}
            </Button>
        </div>
    );
}

// ── Main panel — Steps ──────────────────────────────────────────────────

interface StepsPanelProps {
    paper: ExegeticalPaper;
    language: SupportedLanguage;
    passageEligible: boolean;
    passageHint: string | null;
    onStartGeneration: () => void;
    starting: boolean;
    t: (key: string, opts?: Record<string, unknown>) => string;
}

function StepsPanel({
    paper,
    language,
    passageEligible,
    passageHint,
    onStartGeneration,
    starting,
    t,
}: StepsPanelProps) {
    const hasSteps = paper.steps.length > 0;
    const sortedSteps = [...paper.steps].sort((a, b) => a.order - b.order);

    return (
        <section className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
            <header className="flex items-start justify-between gap-3 mb-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <NotebookPen className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                            {t('detail.stepsTitle')}
                        </h2>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        {t('detail.stepsSubtitle')}
                    </p>
                </div>
                {!hasSteps && (
                    <Button
                        size="sm"
                        onClick={onStartGeneration}
                        disabled={!passageEligible || starting}
                        className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 disabled:opacity-50"
                    >
                        {starting ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5 mr-1.5" />}
                        {t('detail.steps.startCta')}
                    </Button>
                )}
            </header>

            {!hasSteps ? (
                <div className="rounded-xl border border-dashed border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900/40 px-6 py-10 text-center">
                    <div className="mx-auto w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300 flex items-center justify-center mb-3">
                        <Wand2 className="h-5 w-5" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">
                        {t('detail.stepsEmpty.title')}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                        {countVerses(paper) !== null
                            ? t('detail.stepsEmpty.body_other', { verseCount: countVerses(paper) })
                            : t('detail.stepsEmpty.body')}
                    </p>
                    {!passageEligible && passageHint && (
                        <p className="mt-3 text-[11px] text-amber-700 dark:text-amber-300 inline-flex items-start gap-1.5 max-w-md mx-auto text-left">
                            <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                            <span>{passageHint}</span>
                        </p>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    {sortedSteps.map(step => (
                        <StepCard key={step.id} step={step} paperId={paper.id} language={language} />
                    ))}
                </div>
            )}
        </section>
    );
}

// ── Sidebar — Rubric ────────────────────────────────────────────────────

/**
 * Surfaces `paper.rubric` (embedded snapshot) so the detail view shows
 * the same source of truth the setup wizard edits.
 *
 * Headline resolution priority:
 *   1. If the rubric came from a saved template AND that template
 *      still exists in the user's library → show the template's
 *      `displayName`. That's the identity the user picked and
 *      remembers.
 *   2. Otherwise fall back to the provenance label ("Desde plantilla",
 *      "Editada", "Default del sistema", "Extraída de…").
 *
 * The provenance label still appears as a smaller hint when the
 * headline is the template name AND the rubric has been edited since
 * apply (so the user sees "Trabajo Exegético TMS · editada") — this
 * keeps the breadcrumb honest without losing the name.
 */
function RubricCard({ paper, t }: { paper: ExegeticalPaper; t: (key: string, opts?: Record<string, unknown>) => string }) {
    const rubric = paper.rubric;
    const { rubrics: userRubrics } = useUserRubrics();
    const sourceTemplate = rubric?.sourceTemplateId
        ? userRubrics.find(r => r.id === rubric.sourceTemplateId) ?? null
        : null;
    const lengthLabel = rubric?.expectedLength ? formatExpectedLength(rubric.expectedLength, t) : null;

    const headline = sourceTemplate
        ? sourceTemplate.displayName
        : rubric
            ? t(`paperSetup.subSteps.rubric.provenance.${rubric.provenance}`)
            : null;

    // Show provenance as hint only when (a) the headline is the
    // template name and (b) the rubric has been edited since apply
    // (provenance flipped to 'user-edited'). Otherwise the headline
    // already conveys the provenance.
    const provenanceHint = sourceTemplate && rubric && rubric.provenance === 'user-edited'
        ? t(`paperSetup.subSteps.rubric.provenance.${rubric.provenance}`)
        : null;

    return (
        <section className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
            <header className="flex items-center gap-2 mb-3">
                <FileCheck2 className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {t('detail.rubric.title')}
                </h3>
            </header>
            {rubric ? (
                <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/60 dark:bg-emerald-950/20 px-3 py-2">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                        {headline}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {provenanceHint ? `${provenanceHint} · ` : ''}
                        {t('detail.rubric.requirementsCount', { count: rubric.sourceRequirements.length })}
                        {lengthLabel ? ` · ${lengthLabel}` : ''}
                    </p>
                </div>
            ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                    {t('detail.rubric.none')}
                </p>
            )}
            <Link
                to={`/dashboard/exegesis/${paper.id}/setup`}
                className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-success hover:text-success-subtle-foreground"
            >
                <Pencil className="h-3 w-3" />
                {t('detail.rubric.changeCta')}
            </Link>
        </section>
    );
}

/**
 * Renders an `ExpectedLengthRange` as a compact label. Picks the right
 * unit and handles the "min only" case (open upper bound) separately
 * since `min–null` reads awkwardly.
 */
function formatExpectedLength(
    range: NonNullable<ExegeticalPaper['rubric']>['expectedLength'],
    t: (key: string, opts?: Record<string, unknown>) => string,
): string | null {
    if (!range) return null;
    const { unit, min, max } = range;
    if (min !== null && max !== null) {
        return t(unit === 'pages' ? 'detail.rubric.lengthPages' : 'detail.rubric.lengthWords', { min, max });
    }
    if (min !== null) {
        return t(unit === 'pages' ? 'detail.rubric.lengthMinPages' : 'detail.rubric.lengthMinWords', { min });
    }
    return null;
}

// ── Sidebar — Style guide ───────────────────────────────────────────────

function StyleGuideCard({ paper, t }: { paper: ExegeticalPaper; t: (key: string) => string }) {
    const { guides, activeGuide } = useUserStyleGuides();
    // Resolution order matches the orchestrator + setup view: a paper
    // may pin a specific guide via `paper.styleGuideId`; if not, it
    // inherits the user-level active guide. The detail card has to
    // mirror this — otherwise the user sees "no guide" here while the
    // setup shows one, contradicting itself.
    const pinned = paper.styleGuideId
        ? guides.find(g => g.id === paper.styleGuideId) ?? null
        : null;
    const effective = pinned ?? activeGuide;
    // Distinguish "explicitly chosen for this paper" from "inherited
    // because it's your active guide" — both work for generation but
    // the user should know which they're looking at.
    const isInherited = !pinned && effective !== null;

    return (
        <section className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
            <header className="flex items-center gap-2 mb-3">
                <BookOpen className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {t('detail.styleGuide.title')}
                </h3>
            </header>
            {effective ? (
                <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/60 dark:bg-emerald-950/20 px-3 py-2">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                        {effective.displayName}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {isInherited ? t('detail.styleGuide.inheritedHint') : null}
                        {isInherited && effective.version ? ' · ' : ''}
                        {effective.version ? `v${effective.version}` : ''}
                    </p>
                </div>
            ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                    {t('detail.styleGuide.none')}
                </p>
            )}
            <Link
                to={`/dashboard/exegesis/${paper.id}/setup`}
                className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-success hover:text-success-subtle-foreground"
            >
                <Pencil className="h-3 w-3" />
                {t('detail.styleGuide.changeCta')}
            </Link>
        </section>
    );
}

// ── Sidebar — Sources ───────────────────────────────────────────────────

function SourcesCard({
    paper,
    onRemove,
    isRemoving,
    t,
}: {
    paper: ExegeticalPaper;
    onRemove: (sourceId: string) => Promise<void>;
    isRemoving: boolean;
    t: (key: string) => string;
}) {
    return (
        <section className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
            <header className="flex items-center gap-2 mb-3">
                <FileStack className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {t('detail.sources.title')}
                </h3>
                <span className="ml-auto text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    {paper.sources.length}
                </span>
            </header>

            {paper.sources.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                    {t('detail.sources.none')}
                </p>
            ) : (
                <ul className="space-y-1.5">
                    {paper.sources.map(s => (
                        <SourceRow key={s.id} source={s} onRemove={() => onRemove(s.id)} disabled={isRemoving} t={t} />
                    ))}
                </ul>
            )}

            <Link
                to={`/dashboard/exegesis/${paper.id}/setup`}
                className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-success hover:text-success-subtle-foreground"
            >
                <Pencil className="h-3 w-3" />
                {t('detail.sources.addCta')}
            </Link>
        </section>
    );
}

function SourceRow({
    source,
    onRemove,
    disabled,
    t,
}: {
    source: ProjectSource;
    onRemove: () => void;
    disabled: boolean;
    t: (key: string) => string;
}) {
    const isStyleTemplate = source.sourceType === 'style-template-paper';
    return (
        <li className="group flex items-start gap-2 rounded-md border border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/60 px-2.5 py-2">
            <BookOpenText className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-800 dark:text-slate-100 truncate">
                    {source.displayLabel}
                </p>
                <p className={
                    isStyleTemplate
                        ? 'text-[10px] text-amber-700 dark:text-amber-300 truncate'
                        : 'text-[10px] text-slate-500 dark:text-slate-400 truncate'
                }>
                    {t(`sourceTypes.${source.sourceType}.label`)}
                    {source.citationKey && !isStyleTemplate ? ` · ${source.citationKey}` : ''}
                </p>
            </div>
            <button
                type="button"
                onClick={onRemove}
                disabled={disabled}
                className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all disabled:opacity-30"
                aria-label={t('detail.sources.remove')}
                title={t('detail.sources.remove')}
            >
                <X className="h-3 w-3" />
            </button>
        </li>
    );
}

// ── Misc helpers ────────────────────────────────────────────────────────

function CenteredMessage({
    icon,
    text,
    tone = 'neutral',
}: {
    icon: React.ReactNode;
    text: string;
    tone?: 'neutral' | 'error';
}) {
    return (
        <div className="flex items-center justify-center h-full bg-slate-50/50 dark:bg-zinc-950/50">
            <div className={
                tone === 'error'
                    ? 'inline-flex items-center gap-2 text-sm text-rose-700 dark:text-rose-300'
                    : 'inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400'
            }>
                {icon}
                <span>{text}</span>
            </div>
        </div>
    );
}

function NotFound() {
    const { t } = useTranslation('exegesis');
    return (
        <div className="flex flex-col items-center justify-center h-full bg-slate-50/50 dark:bg-zinc-950/50 px-6 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-400 flex items-center justify-center mb-3">
                <NotebookPen className="h-5 w-5" />
            </div>
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-1">
                {t('detail.notFound.title')}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 max-w-md">
                {t('detail.notFound.body')}
            </p>
            <Link
                to="/dashboard/exegesis"
                className="text-sm font-medium text-emerald-700 dark:text-emerald-300 hover:underline"
            >
                {t('detail.notFound.backCta')}
            </Link>
        </div>
    );
}

/**
 * Number of verses in the paper's passage range. Used in the empty
 * step state to set expectations ("we'll generate N verses + conclusion +
 * intro + assembly"). Falls back to "this passage" for chapter-only or
 * multi-chapter ranges where verse counting requires verses-per-chapter
 * data we don't carry in v1.
 */
function countVerses(paper: ExegeticalPaper): number | null {
    const { chapterStart, chapterEnd, verseStart, verseEnd } = paper.passage;
    if (verseStart === null || verseEnd === null) return null;
    if (chapterStart !== chapterEnd) return null; // multi-chapter, can't count without per-chapter data
    return verseEnd - verseStart + 1;
}

/**
 * Whether the paper's passage shape qualifies for generation in v1
 * (single chapter with explicit verses). Mirror of the seedSteps repo
 * check — surfaced upfront so the user sees the gate BEFORE clicking
 * "Iniciar generación" instead of as an error toast after.
 */
function passageEligibleForGeneration(paper: ExegeticalPaper): {
    eligible: boolean;
    hint: (t: (key: string) => string) => string | null;
} {
    const { chapterStart, chapterEnd, verseStart, verseEnd } = paper.passage;
    if (chapterStart !== chapterEnd) {
        return { eligible: false, hint: (t) => t('detail.steps.gate.multiChapter') };
    }
    if (verseStart === null || verseEnd === null) {
        return { eligible: false, hint: (t) => t('detail.steps.gate.noVerses') };
    }
    return { eligible: true, hint: () => null };
}
