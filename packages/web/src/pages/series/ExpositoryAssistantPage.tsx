import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
    ArrowLeft,
    BookOpenText,
    CheckCircle2,
    CircleDashed,
    Loader2,
    AlertTriangle,
    Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/i18n';
import { useExpositoryAssistant } from '@/hooks/series/useExpositoryAssistant';
import {
    getAllBooks,
    type AssistantVerseInput,
    type BibleBookId,
    type BookPanorama,
    type MacroSection,
} from '@dosfilos/domain';

/**
 * v1.5 expository assistant wizard.
 *
 * Replaces PericopeAssistantPage at /dashboard/plans/pericope. Runs
 * the 5-pass pipeline (panorama → macro → micro → preachable →
 * fidelity) with staged UI feedback — each pass appears as a card
 * with state pending / running / done / error and renders its
 * result inline as soon as it lands.
 *
 * D.2 wires Pases 1 (panorama) and 2 (macroestructura). On "Iniciar
 * análisis" we load verses synchronously and then auto-chain
 * panorama → macro; D.3 will continue the chain into micro →
 * preachable → fidelity.
 *
 * Workflow state lives in component state because v1.5 does not
 * persist intermediate runs server-side — only the final
 * SermonSeries does. D.4 will add localStorage draft persistence
 * so a tab close mid-run is recoverable.
 */
export function ExpositoryAssistantPage() {
    const { t, i18n } = useTranslation('series');
    const lang: 'es' | 'en' = i18n.language?.split('-')[0] === 'en' ? 'en' : 'es';

    const allBooks = useMemo(() => getAllBooks(), []);
    const [bookId, setBookId] = useState<BibleBookId>('2PE');
    const [targetCount, setTargetCount] = useState<number | ''>('');

    // Run state — accumulates as each pass completes.
    const [verses, setVerses] = useState<AssistantVerseInput[] | null>(null);
    const [bookDisplay, setBookDisplay] = useState<string | null>(null);
    const [panorama, setPanorama] = useState<BookPanorama | null>(null);
    const [macroSections, setMacroSections] = useState<MacroSection[] | null>(null);

    const assistant = useExpositoryAssistant();

    const handleStart = () => {
        // Reset prior run state if the pastor restarts.
        setPanorama(null);
        setMacroSections(null);

        let loaded;
        try {
            loaded = assistant.loadVerses({ bookId, displayLanguage: lang });
        } catch (err: any) {
            console.error('[expository] loadVerses failed:', err);
            toast.error(err?.message ?? (t('expository.toast.loadFailed') as string));
            return;
        }
        setVerses(loaded.verses);
        setBookDisplay(loaded.book);

        // Kick off Pase 1. The macro pass auto-chains in onSuccess below.
        assistant.runPanorama.mutate(
            {
                book: loaded.book,
                displayLanguage: lang,
                verses: loaded.verses,
                ...(typeof targetCount === 'number' ? { targetPreachableCount: targetCount } : {}),
            },
            {
                onSuccess: (panoramaResult) => {
                    setPanorama(panoramaResult.payload);
                    // Auto-chain Pase 2.
                    assistant.runMacro.mutate(
                        {
                            book: loaded.book,
                            displayLanguage: lang,
                            verses: loaded.verses,
                            panorama: panoramaResult.payload,
                        },
                        {
                            onSuccess: (macroResult) => {
                                setMacroSections(macroResult.payload);
                                toast.success(t('expository.toast.macroDone') as string);
                            },
                            onError: (err: any) => {
                                console.error('[expository] runMacro failed:', err);
                                toast.error(toastErrorMessage(err, t, 'expository.toast.macroFailed'));
                            },
                        },
                    );
                },
                onError: (err: any) => {
                    console.error('[expository] runPanorama failed:', err);
                    toast.error(toastErrorMessage(err, t, 'expository.toast.panoramaFailed'));
                },
            },
        );
    };

    const panoramaState: PassState = assistant.runPanorama.isPending
        ? 'running'
        : panorama
          ? 'done'
          : assistant.runPanorama.isError
            ? 'error'
            : 'pending';
    const macroState: PassState = assistant.runMacro.isPending
        ? 'running'
        : macroSections
          ? 'done'
          : assistant.runMacro.isError
            ? 'error'
            : 'pending';

    const isRunning = assistant.runPanorama.isPending || assistant.runMacro.isPending;

    return (
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-zinc-950/50 overflow-y-auto">
            {/* Header */}
            <div className="border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-4">
                <div className="max-w-5xl mx-auto flex items-center gap-3">
                    <Link
                        to="/dashboard/plans"
                        className="inline-flex items-center justify-center h-8 w-8 rounded-md text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                        aria-label={t('expository.back') as string}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100 font-serif truncate">
                            {t('expository.title')}
                        </h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {t('expository.subtitle')}
                        </p>
                    </div>
                </div>
            </div>

            <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-8 space-y-6">
                <SetupCard
                    bookId={bookId}
                    onBookIdChange={setBookId}
                    targetCount={targetCount}
                    onTargetCountChange={setTargetCount}
                    lang={lang}
                    allBooks={allBooks}
                    isRunning={isRunning}
                    onStart={handleStart}
                    t={t}
                />

                <PassCard
                    index={1}
                    title={t('expository.passes.panorama.title') as string}
                    subtitle={t('expository.passes.panorama.subtitle') as string}
                    state={panoramaState}
                    t={t}
                >
                    {panorama && <PanoramaResult panorama={panorama} t={t} />}
                </PassCard>

                <PassCard
                    index={2}
                    title={t('expository.passes.macro.title') as string}
                    subtitle={t('expository.passes.macro.subtitle') as string}
                    state={macroState}
                    t={t}
                >
                    {macroSections && bookDisplay && (
                        <MacroResult sections={macroSections} bookDisplay={bookDisplay} t={t} />
                    )}
                </PassCard>

                <PassCard index={3} title={t('expository.passes.micro.title') as string} subtitle={t('expository.passes.micro.subtitle') as string} state="pending" t={t} />
                <PassCard index={4} title={t('expository.passes.preachable.title') as string} subtitle={t('expository.passes.preachable.subtitle') as string} state="pending" t={t} />
                <PassCard index={5} title={t('expository.passes.fidelity.title') as string} subtitle={t('expository.passes.fidelity.subtitle') as string} state="pending" t={t} />
            </main>
        </div>
    );
}

function toastErrorMessage(
    err: any,
    t: (key: string) => string,
    fallbackKey: string,
): string {
    if (err?.isExegesisOverload) return t('expository.toast.overloaded') as string;
    if (err?.message) return err.message;
    return t(fallbackKey) as string;
}

// ── Setup card ──────────────────────────────────────────────────────────

function SetupCard({
    bookId,
    onBookIdChange,
    targetCount,
    onTargetCountChange,
    lang,
    allBooks,
    isRunning,
    onStart,
    t,
}: {
    bookId: BibleBookId;
    onBookIdChange: (id: BibleBookId) => void;
    targetCount: number | '';
    onTargetCountChange: (n: number | '') => void;
    lang: 'es' | 'en';
    allBooks: ReadonlyArray<{ id: BibleBookId; nameEs: string; nameEn: string; testament: 'OT' | 'NT' }>;
    isRunning: boolean;
    onStart: () => void;
    t: (key: string) => string;
}) {
    return (
        <section className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
            <header className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                    <BookOpenText className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                    <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                        {t('expository.setup.title')}
                    </h2>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('expository.setup.subtitle')}
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                    <Label htmlFor="book">{t('expository.setup.book')}</Label>
                    <select
                        id="book"
                        value={bookId}
                        onChange={(e) => onBookIdChange(e.target.value as BibleBookId)}
                        disabled={isRunning}
                        className="mt-1.5 w-full h-10 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
                    >
                        <optgroup label={t('expository.setup.testamentNT') as string}>
                            {allBooks.filter((b) => b.testament === 'NT').map((b) => (
                                <option key={b.id} value={b.id}>
                                    {lang === 'en' ? b.nameEn : b.nameEs}
                                </option>
                            ))}
                        </optgroup>
                        <optgroup label={t('expository.setup.testamentOT') as string}>
                            {allBooks.filter((b) => b.testament === 'OT').map((b) => (
                                <option key={b.id} value={b.id}>
                                    {lang === 'en' ? b.nameEn : b.nameEs}
                                </option>
                            ))}
                        </optgroup>
                    </select>
                </div>
                <div>
                    <Label htmlFor="target">{t('expository.setup.targetCount')}</Label>
                    <Input
                        id="target"
                        type="number"
                        min={3}
                        max={60}
                        value={targetCount}
                        disabled={isRunning}
                        onChange={(e) => {
                            const v = e.target.value;
                            onTargetCountChange(v === '' ? '' : Math.max(1, Number(v)));
                        }}
                        placeholder={t('expository.setup.targetCountPlaceholder') as string}
                        className="mt-1.5"
                    />
                </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-4">
                <p className="text-[11px] text-amber-700 dark:text-amber-300 max-w-xl">
                    {t('expository.setup.translationNote')}
                </p>
                <Button
                    onClick={onStart}
                    disabled={isRunning}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 disabled:opacity-50"
                >
                    {isRunning ? (
                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    ) : (
                        <Sparkles className="h-4 w-4 mr-1.5" />
                    )}
                    {isRunning ? t('expository.setup.running') : t('expository.setup.start')}
                </Button>
            </div>
        </section>
    );
}

// ── Pass card primitives ────────────────────────────────────────────────

type PassState = 'pending' | 'running' | 'done' | 'error';

function PassCard({
    index,
    title,
    subtitle,
    state,
    children,
    t,
}: {
    index: number;
    title: string;
    subtitle: string;
    state: PassState;
    children?: React.ReactNode;
    t: (key: string) => string;
}) {
    return (
        <section className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
            <header className="flex items-start gap-3">
                <PassStateBadge state={state} />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] uppercase tracking-wide text-slate-400 font-mono">
                            {t('expository.pass')} {index}
                        </span>
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {title}
                        </h3>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {subtitle}
                    </p>
                </div>
                <span className="text-[11px] text-slate-400 italic">
                    {t(`expository.state.${state}`)}
                </span>
            </header>
            {children && <div className="mt-4">{children}</div>}
        </section>
    );
}

function PassStateBadge({ state }: { state: PassState }) {
    if (state === 'running') {
        return (
            <div className="shrink-0 w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin" />
            </div>
        );
    }
    if (state === 'done') {
        return (
            <div className="shrink-0 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4" />
            </div>
        );
    }
    if (state === 'error') {
        return (
            <div className="shrink-0 w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4" />
            </div>
        );
    }
    return (
        <div className="shrink-0 w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-400 flex items-center justify-center">
            <CircleDashed className="h-4 w-4" />
        </div>
    );
}

// ── Pass 1 result ───────────────────────────────────────────────────────

function PanoramaResult({ panorama, t }: { panorama: BookPanorama; t: (key: string) => string }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <ResultRow label={t('expository.results.panorama.genre')} value={panorama.genre} mono />
            <ResultRow label={t('expository.results.panorama.theme')} value={panorama.centralTheme} />
            <ResultRow label={t('expository.results.panorama.purpose')} value={panorama.purpose} fullWidth />
            <ResultRow label={t('expository.results.panorama.problem')} value={panorama.pastoralProblem} fullWidth />
            <ResultRow
                label={t('expository.results.panorama.movements')}
                value={panorama.movements.join(' / ')}
                fullWidth
            />
            {panorama.keyTerms.length > 0 && (
                <ResultRow
                    label={t('expository.results.panorama.keyTerms')}
                    value={panorama.keyTerms.join(', ')}
                    fullWidth
                />
            )}
            {panorama.redemptiveHistoryNote && (
                <ResultRow
                    label={t('expository.results.panorama.redemptiveHistory')}
                    value={panorama.redemptiveHistoryNote}
                    fullWidth
                />
            )}
        </div>
    );
}

function ResultRow({
    label,
    value,
    fullWidth,
    mono,
}: {
    label: string;
    value: string;
    fullWidth?: boolean;
    mono?: boolean;
}) {
    return (
        <div className={fullWidth ? 'md:col-span-2' : ''}>
            <p className="text-[11px] uppercase tracking-wide text-slate-400 font-medium mb-0.5">
                {label}
            </p>
            <p className={`text-slate-700 dark:text-slate-200 ${mono ? 'font-mono text-xs' : ''}`}>
                {value}
            </p>
        </div>
    );
}

// ── Pass 2 result ───────────────────────────────────────────────────────

function MacroResult({
    sections,
    bookDisplay,
    t,
}: {
    sections: ReadonlyArray<MacroSection>;
    bookDisplay: string;
    t: (key: string) => string;
}) {
    return (
        <ul className="space-y-2">
            {sections.map((s) => {
                const range = s.chapterStart === s.chapterEnd
                    ? `${s.chapterStart}:${s.verseStart}-${s.verseEnd}`
                    : `${s.chapterStart}:${s.verseStart}-${s.chapterEnd}:${s.verseEnd}`;
                return (
                    <li
                        key={s.id}
                        className="rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40 px-3 py-2.5"
                    >
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                                {s.title}
                            </span>
                            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                                {bookDisplay} {range}
                            </span>
                            <span className="text-[10px] uppercase tracking-wide font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded">
                                {t(`expository.results.macro.function.${s.functionInBook}`)}
                            </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">{s.theme}</p>
                    </li>
                );
            })}
        </ul>
    );
}
