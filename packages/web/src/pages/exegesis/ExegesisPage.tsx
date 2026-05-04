import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { NotebookPen, Plus, Sparkles, Loader2, AlertCircle, Search, X, Archive, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { seriesService } from '@dosfilos/application';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n';
import { useFirebase } from '@/context/firebase-context';
import { useExegesisPapers } from '@/hooks/exegesis/useExegesisPapers';
import { UserRubricsSection } from '@/components/exegesis/directory/UserRubricsSection';
import { UserStyleGuidesSection } from '@/components/exegesis/directory/UserStyleGuidesSection';
import {
    formatPassageReference,
    type ExegeticalPaper,
    type ExegeticalPaperPhase,
    type SupportedLanguage,
} from '@dosfilos/domain';

// Phases shown as filter chips. 'archived' is excluded — it has its own
// toggle since archived papers are usually noise unless explicitly asked
// for. Order is the natural lifecycle order (configuring → in-progress →
// assembled).
const FILTERABLE_PHASES: ExegeticalPaperPhase[] = ['configuring', 'in-progress', 'assembled'];

/**
 * Exégesis — landing del módulo de redacción exegética asistida.
 *
 * Renders the user's papers list (live from Firestore via TanStack Query)
 * plus the entry point to the setup wizard. Empty state and loading state
 * keep the page coherent before the data arrives. The "v1 en construcción"
 * banner stays put as honest comms while step generation and citation
 * verification land in subsequent commits.
 */
export function ExegesisPage() {
    const { t, i18n } = useTranslation('exegesis');
    const navigate = useNavigate();
    const goToSetup = () => navigate('/dashboard/exegesis/new');
    const { papers, isLoading, error } = useExegesisPapers();
    const { user } = useFirebase();
    const activeLanguage: SupportedLanguage = i18n.language?.split('-')[0] === 'en' ? 'en' : 'es';

    // Fetch the user's series so we can show "belongs to series X" on
    // each paper card. A planned sermon inside a series can carry a
    // `paperId` pointing at an ExegeticalPaper — when present, the
    // paper is part of an expository series and the user benefits
    // from seeing that link without having to remember the
    // relationship themselves. Index lookup is built once per series
    // refetch.
    const { data: seriesList = [] } = useQuery({
        queryKey: ['series', 'forExegesisPapers', user?.uid],
        queryFn: async () => {
            if (!user?.uid) return [];
            return seriesService.getUserSeries(user.uid);
        },
        enabled: !!user?.uid,
    });

    const paperToSeries = useMemo(() => {
        const idx = new Map<string, { id: string; title: string }>();
        for (const series of seriesList) {
            const planned = series.metadata?.plannedSermons ?? [];
            for (const sermon of planned) {
                if (sermon.paperId) {
                    idx.set(sermon.paperId, { id: series.id, title: series.title });
                }
            }
        }
        return idx;
    }, [seriesList]);

    // Client-side filter state. The data set is per-user (rarely more
    // than a few dozen papers), so filtering in memory is fine — no need
    // to push these into the Firestore query.
    const [search, setSearch] = useState('');
    const [phaseFilter, setPhaseFilter] = useState<ExegeticalPaperPhase | 'all'>('all');
    const [includeArchived, setIncludeArchived] = useState(false);

    const filteredPapers = useMemo(() => {
        const q = search.trim().toLowerCase();
        return papers.filter(p => {
            // Archived papers are hidden by default. The 'archived' phase
            // and the soft-delete `archivedAt` marker can both signal an
            // archived paper depending on history; treat either as such.
            const isArchived = p.phase === 'archived' || p.archivedAt !== null;
            if (isArchived && !includeArchived) return false;
            if (phaseFilter !== 'all' && p.phase !== phaseFilter) return false;
            if (q.length > 0) {
                const haystack = `${p.title ?? ''} ${formatPassageReference(p.passage, activeLanguage)}`.toLowerCase();
                if (!haystack.includes(q)) return false;
            }
            return true;
        });
    }, [papers, search, phaseFilter, includeArchived, activeLanguage]);

    const hasActiveFilters = search.length > 0 || phaseFilter !== 'all' || includeArchived;
    const clearFilters = () => {
        setSearch('');
        setPhaseFilter('all');
        setIncludeArchived(false);
    };

    return (
        <div className="flex flex-col h-full bg-background font-sans overflow-y-auto">
            {/* Compact hero — brand identity only, no CTA. The
                "+ Nuevo trabajo" button now lives in the papers
                section header (and as the empty-state primary
                action). Decoupling brand from action lets the
                hero shrink without losing personality. */}
            <div
                className="relative pt-8 pb-10 px-6 sm:px-10 text-white overflow-hidden shrink-0"
                style={{ background: 'linear-gradient(to bottom, #0f172a, #1e293b)' }}
            >
                <div
                    className="absolute inset-0 opacity-[0.04]"
                    style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(16,185,129,0.3) 2px, rgba(16,185,129,0.3) 3px)' }}
                />
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-600 rounded-full mix-blend-multiply filter blur-3xl opacity-10" />

                <div className="relative z-10 max-w-6xl mx-auto flex items-center gap-4">
                    <div className="shrink-0 w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 flex items-center justify-center">
                        <NotebookPen className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white leading-tight font-serif">
                            {t('directory.heroTitle')}
                        </h1>
                        <p className="text-slate-300/80 text-sm leading-snug mt-1 max-w-3xl">
                            {t('directory.heroSubtitle')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Body — 2-column grid. Papers dominate the main column;
                resources (rubrics + style guides) sit in a sticky
                sidebar so the user always has them in peripheral
                vision while scrolling through papers. On narrow
                screens the columns stack. */}
            <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
                    {/* Main column — papers */}
                    <section>
                        <header className="flex items-center justify-between gap-3 mb-4">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <div className="w-1 h-5 rounded-full bg-primary" />
                                    <h2 className="text-xl font-bold text-foreground font-serif">
                                        {t('directory.papersTitle')}
                                    </h2>
                                </div>
                                <p className="text-sm text-muted-foreground pl-3 mt-0.5">
                                    {t('directory.papersSubtitle')}
                                </p>
                            </div>
                            <Button
                                onClick={goToSetup}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
                            >
                                <Plus className="h-4 w-4 mr-1.5" />
                                {t('directory.newPaperCta')}
                            </Button>
                        </header>

                        {/* Toolbar: only render once there's data worth filtering.
                            Empty/loading/error states have nothing for the user
                            to filter against, so showing the toolbar then would
                            just be noise. */}
                        {!isLoading && !error && papers.length > 0 && (
                            <PapersToolbar
                                t={t}
                                search={search}
                                onSearchChange={setSearch}
                                phaseFilter={phaseFilter}
                                onPhaseFilterChange={setPhaseFilter}
                                includeArchived={includeArchived}
                                onIncludeArchivedChange={setIncludeArchived}
                                visibleCount={filteredPapers.length}
                                totalCount={papers.length}
                                hasActiveFilters={hasActiveFilters}
                                onClear={clearFilters}
                            />
                        )}

                        {isLoading ? (
                            <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-8 py-10 text-center text-sm text-muted-foreground">
                                <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-success" />
                                {t('list.loading')}
                            </div>
                        ) : error ? (
                            <ErrorBlock error={error} fallbackMessage={t('list.loadFailed')} />
                        ) : papers.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-8 py-12 text-center">
                                <div className="mx-auto w-12 h-12 rounded-full bg-success-subtle text-success flex items-center justify-center mb-4">
                                    <NotebookPen className="h-6 w-6" />
                                </div>
                                <h3 className="text-base font-semibold text-foreground mb-2">
                                    {t('directory.empty.title')}
                                </h3>
                                <p className="text-sm text-muted-foreground max-w-md mx-auto mb-5">
                                    {t('directory.empty.body')}
                                </p>
                                <Button
                                    onClick={goToSetup}
                                    variant="outline"
                                    className="border-success/40 text-success-subtle-foreground"
                                >
                                    <Sparkles className="h-4 w-4 mr-1.5" />
                                    {t('directory.empty.cta')}
                                </Button>
                            </div>
                        ) : filteredPapers.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-6 py-10 text-center">
                                <Search className="h-6 w-6 text-muted-foreground mx-auto mb-3" />
                                <h3 className="text-sm font-semibold text-foreground mb-1">
                                    {t('list.filters.noMatches')}
                                </h3>
                                <p className="text-xs text-muted-foreground mb-4">
                                    {t('list.filters.noMatchesHint')}
                                </p>
                                <Button onClick={clearFilters} variant="outline" size="sm">
                                    {t('list.filters.clear')}
                                </Button>
                            </div>
                        ) : (
                            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {filteredPapers.map(p => (
                                    <PaperCard
                                        key={p.id}
                                        paper={p}
                                        language={activeLanguage}
                                        t={t}
                                        seriesLink={paperToSeries.get(p.id) ?? null}
                                    />
                                ))}
                            </ul>
                        )}
                    </section>

                    {/* Sidebar — resources */}
                    <aside className="space-y-4 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
                        <UserRubricsSection />
                        <UserStyleGuidesSection />
                    </aside>
                </div>
            </main>
        </div>
    );
}

// ── Toolbar ─────────────────────────────────────────────────────────────

interface PapersToolbarProps {
    t: (key: string, opts?: Record<string, unknown>) => string;
    search: string;
    onSearchChange: (s: string) => void;
    phaseFilter: ExegeticalPaperPhase | 'all';
    onPhaseFilterChange: (p: ExegeticalPaperPhase | 'all') => void;
    includeArchived: boolean;
    onIncludeArchivedChange: (v: boolean) => void;
    visibleCount: number;
    totalCount: number;
    hasActiveFilters: boolean;
    onClear: () => void;
}

function PapersToolbar({
    t,
    search,
    onSearchChange,
    phaseFilter,
    onPhaseFilterChange,
    includeArchived,
    onIncludeArchivedChange,
    visibleCount,
    totalCount,
    hasActiveFilters,
    onClear,
}: PapersToolbarProps) {
    return (
        <div className="mb-4 space-y-3">
            <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                    type="search"
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder={t('list.filters.searchPlaceholder')}
                    className="w-full rounded-lg border border-border bg-card pl-9 pr-9 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                />
                {search.length > 0 && (
                    <button
                        type="button"
                        onClick={() => onSearchChange('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent"
                        aria-label={t('list.filters.clear')}
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <PhaseChip
                    active={phaseFilter === 'all'}
                    onClick={() => onPhaseFilterChange('all')}
                    label={t('list.filters.all')}
                />
                {FILTERABLE_PHASES.map(phase => (
                    <PhaseChip
                        key={phase}
                        active={phaseFilter === phase}
                        onClick={() => onPhaseFilterChange(phase)}
                        label={t(`list.phase.${phase}`)}
                    />
                ))}

                <button
                    type="button"
                    onClick={() => onIncludeArchivedChange(!includeArchived)}
                    className={[
                        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                        includeArchived
                            ? 'border-success bg-success-subtle text-success-subtle-foreground'
                            : 'border-border bg-card text-muted-foreground hover:bg-accent',
                    ].join(' ')}
                    aria-pressed={includeArchived}
                >
                    <Archive className="h-3 w-3" />
                    {t('list.filters.showArchived')}
                </button>

                <span className="text-xs text-muted-foreground ml-auto">
                    {hasActiveFilters
                        ? t('list.filters.countFiltered', { visible: visibleCount, total: totalCount })
                        : t('list.filters.countAll', { count: totalCount })}
                </span>

                {hasActiveFilters && (
                    <button
                        type="button"
                        onClick={onClear}
                        className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                    >
                        {t('list.filters.clear')}
                    </button>
                )}
            </div>
        </div>
    );
}

function PhaseChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={[
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-muted-foreground hover:bg-accent',
            ].join(' ')}
            aria-pressed={active}
        >
            {label}
        </button>
    );
}

// ── Card ────────────────────────────────────────────────────────────────

interface PaperCardProps {
    paper: ExegeticalPaper;
    language: SupportedLanguage;
    t: (key: string) => string;
    /**
     * When the paper is referenced from a sermon series'
     * `plannedSermons[].paperId`, surface that link on the card so
     * the user understands the paper's larger preaching context. Null
     * when the paper is standalone.
     */
    seriesLink: { id: string; title: string } | null;
}

// Phase → semantic-token color map. Driving badge color from phase is
// the cheapest scannability win in a 2-col grid: the user can tell at a
// glance which papers are still in setup vs being written vs assembled.
const PHASE_BADGE: Record<ExegeticalPaperPhase, string> = {
    'configuring': 'bg-warning-subtle text-warning-subtle-foreground border-warning/30',
    'in-progress': 'bg-info-subtle text-info-subtle-foreground border-info/30',
    'assembled': 'bg-success-subtle text-success-subtle-foreground border-success/30',
    'archived': 'bg-muted text-muted-foreground border-border',
};

function PaperCard({ paper, language, t, seriesLink }: PaperCardProps) {
    const navigate = useNavigate();
    const open = () => navigate(`/dashboard/exegesis/${paper.id}`);
    const passageDisplay = paper.title || formatPassageReference(paper.passage, language);
    const isArchived = paper.phase === 'archived' || paper.archivedAt !== null;

    const handleSeriesClick = (e: React.MouseEvent) => {
        // Stop the parent button's onClick (which navigates to the
        // paper detail) so the user lands on the series instead.
        e.stopPropagation();
        if (seriesLink) navigate(`/dashboard/plans/${seriesLink.id}`);
    };

    return (
        <li>
            <button
                type="button"
                onClick={open}
                className={[
                    'w-full h-full text-left rounded-xl border bg-card hover:border-primary/50 hover:shadow-sm transition-all px-4 py-3 flex flex-col gap-2',
                    isArchived ? 'border-border opacity-70' : 'border-border',
                ].join(' ')}
            >
                <div className="flex items-start gap-3">
                    <div className="shrink-0 w-9 h-9 rounded-full bg-success-subtle text-success flex items-center justify-center">
                        <NotebookPen className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-foreground truncate">
                            {passageDisplay}
                        </h3>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                            {t('list.updatedAt')} {paper.updatedAt.toLocaleDateString()}
                        </p>
                    </div>
                </div>
                {seriesLink && (
                    <div
                        onClick={handleSeriesClick}
                        role="link"
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleSeriesClick(e as unknown as React.MouseEvent);
                            }
                        }}
                        className="inline-flex items-center gap-1.5 text-[11px] text-info-subtle-foreground bg-info-subtle border border-info/30 rounded-md px-2 py-1 hover:bg-info-subtle/80 transition-colors max-w-full"
                        title={t('list.seriesLink.tooltip')}
                    >
                        <BookOpen className="h-3 w-3 shrink-0" />
                        <span className="font-medium shrink-0">{t('list.seriesLink.label')}:</span>
                        <span className="truncate">{seriesLink.title}</span>
                    </div>
                )}
                <div className="flex items-center justify-between">
                    <span className={[
                        'inline-flex items-center text-[10px] font-semibold rounded-full border px-2 py-0.5',
                        PHASE_BADGE[paper.phase],
                    ].join(' ')}>
                        {t(`list.phase.${paper.phase}`)}
                    </span>
                </div>
            </button>
        </li>
    );
}

/**
 * Surfaces query errors with their actual message instead of a
 * generic "no se pudo cargar" toast. The Firestore SDK throws
 * specific messages we want visible during testing — Permission
 * denied (rules out of date), failed-precondition (missing index),
 * deserialization errors (corrupt doc), etc.
 *
 * Falls back to the i18n string when the error has no message.
 */
function ErrorBlock({ error, fallbackMessage }: { error: unknown; fallbackMessage: string }) {
    // Always console.error so the full stack is captured in devtools
    // even when the visible message is short.
    console.error('[exegesis] directory query error:', error);
    const message = error instanceof Error
        ? error.message
        : typeof error === 'string'
            ? error
            : fallbackMessage;
    return (
        <div className="rounded-2xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/60 dark:bg-rose-950/20 px-6 py-5 text-sm text-rose-700 dark:text-rose-300 inline-flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
                <p className="font-medium">{fallbackMessage}</p>
                <p className="text-[11px] mt-1 font-mono break-all opacity-80">{message}</p>
            </div>
        </div>
    );
}
