import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
    ArrowLeft,
    AlertCircle,
    Loader2,
    Archive,
    NotebookPen,
    FileCheck2,
    FileStack,
    Wand2,
    Lock,
    X,
    BookOpenText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n';
import { useExegesisPapers } from '@/hooks/exegesis/useExegesisPapers';
import { useUserStyleGuides } from '@/hooks/exegesis/useUserStyleGuides';
import {
    formatPassageReference,
    type ExegeticalPaper,
    type ProjectSource,
    type ProjectSourceRole,
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

    const { papers, isLoading, error, archivePaper, removeSource } = useExegesisPapers();
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
                    <ArchiveButton onClick={handleArchive} pending={archivePaper.isPending} t={t} />
                </div>
            </div>

            {/* Body */}
            <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
                    <StepsPanel paper={paper} t={t} />
                    <aside className="space-y-4">
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

function StepsPanel({ paper, t }: { paper: ExegeticalPaper; t: (key: string) => string }) {
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
                <Button disabled className="bg-emerald-500 text-slate-900 disabled:opacity-50" size="sm">
                    <Wand2 className="h-3.5 w-3.5 mr-1.5" />
                    {t('detail.generateCta')}
                </Button>
            </header>

            {/* v1.5 placeholder — empty until D (orchestrator) is wired. The
                seedStepsForPassage repo method still throws "not implemented"
                so the steps array is always empty in v1. */}
            <div className="rounded-xl border border-dashed border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900/40 px-6 py-10 text-center">
                <div className="mx-auto w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300 flex items-center justify-center mb-3">
                    <Wand2 className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">
                    {t('detail.stepsEmpty.title')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    {t('detail.stepsEmpty.body', {
                        verseCount: countVerses(paper),
                    })}
                </p>
                <span className="inline-flex items-center gap-1 mt-3 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                    <Lock className="h-3 w-3" />
                    v1.5
                </span>
            </div>
        </section>
    );
}

// ── Sidebar — Style guide ───────────────────────────────────────────────

function StyleGuideCard({ paper, t }: { paper: ExegeticalPaper; t: (key: string) => string }) {
    const { guides } = useUserStyleGuides();
    const attached = paper.styleGuideId ? guides.find(g => g.id === paper.styleGuideId) ?? null : null;

    return (
        <section className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
            <header className="flex items-center gap-2 mb-3">
                <FileCheck2 className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {t('detail.styleGuide.title')}
                </h3>
            </header>
            {attached ? (
                <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/60 dark:bg-emerald-950/20 px-3 py-2">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                        {attached.displayName}
                    </p>
                    {attached.version && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            v{attached.version}
                        </p>
                    )}
                </div>
            ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                    {t('detail.styleGuide.none')}
                </p>
            )}
            <button
                type="button"
                disabled
                className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 dark:text-slate-500 cursor-not-allowed"
                title="v1.5"
            >
                <Lock className="h-3 w-3" />
                {t('detail.styleGuide.changeCta')} · v1.5
            </button>
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

            <button
                type="button"
                disabled
                className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 dark:text-slate-500 cursor-not-allowed"
                title="v1.5"
            >
                <Lock className="h-3 w-3" />
                {t('detail.sources.addCta')} · v1.5
            </button>
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
    const isModelPaper = source.role === 'model-paper';
    return (
        <li className="group flex items-start gap-2 rounded-md border border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/60 px-2.5 py-2">
            <BookOpenText className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-800 dark:text-slate-100 truncate">
                    {source.displayLabel}
                </p>
                <p className={
                    isModelPaper
                        ? 'text-[10px] text-amber-700 dark:text-amber-300 truncate'
                        : 'text-[10px] text-slate-500 dark:text-slate-400 truncate'
                }>
                    {t(`setup.sources.roles.${source.role as ProjectSourceRole}`)}
                    {source.citationKey && !isModelPaper ? ` · ${source.citationKey}` : ''}
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
