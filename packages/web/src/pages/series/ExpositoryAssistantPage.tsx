import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowLeft,
    BookOpenText,
    CheckCircle2,
    CircleDashed,
    Loader2,
    AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/i18n';
import { getAllBooks, type BibleBookId } from '@dosfilos/domain';

/**
 * v1.5 expository assistant wizard.
 *
 * Replaces PericopeAssistantPage at /dashboard/plans/pericope. Runs
 * the 5-pass pipeline (panorama → macro → micro → preachable →
 * fidelity) with staged UI feedback — each pass appears as a card
 * with state pending / running / done / error.
 *
 * D.1 ships the SHELL: setup card + 5 placeholder cards rendering
 * pending state. D.2-D.4 wire the actual mutations and the create-
 * series action.
 *
 * Why a single page (not a multi-step wizard with separate routes):
 * the workflow is a single decision flow on a single book. A multi-
 * step wizard would force navigation between steps that don't make
 * sense in isolation; one page that fills in progressively matches
 * how the pastor reads the analysis.
 */
export function ExpositoryAssistantPage() {
    const { t, i18n } = useTranslation('series');
    const lang: 'es' | 'en' = i18n.language?.split('-')[0] === 'en' ? 'en' : 'es';

    const allBooks = useMemo(() => getAllBooks(), []);
    const [bookId, setBookId] = useState<BibleBookId>('2PE');
    const [targetCount, setTargetCount] = useState<number | ''>('');

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
                {/* Setup */}
                <SetupCard
                    bookId={bookId}
                    onBookIdChange={setBookId}
                    targetCount={targetCount}
                    onTargetCountChange={setTargetCount}
                    lang={lang}
                    allBooks={allBooks}
                    t={t}
                />

                {/* Pipeline cards (D.2-D.3 wire the mutations; D.1 renders pending state) */}
                <PassCard
                    index={1}
                    title={t('expository.passes.panorama.title') as string}
                    subtitle={t('expository.passes.panorama.subtitle') as string}
                    state="pending"
                    t={t}
                />
                <PassCard
                    index={2}
                    title={t('expository.passes.macro.title') as string}
                    subtitle={t('expository.passes.macro.subtitle') as string}
                    state="pending"
                    t={t}
                />
                <PassCard
                    index={3}
                    title={t('expository.passes.micro.title') as string}
                    subtitle={t('expository.passes.micro.subtitle') as string}
                    state="pending"
                    t={t}
                />
                <PassCard
                    index={4}
                    title={t('expository.passes.preachable.title') as string}
                    subtitle={t('expository.passes.preachable.subtitle') as string}
                    state="pending"
                    t={t}
                />
                <PassCard
                    index={5}
                    title={t('expository.passes.fidelity.title') as string}
                    subtitle={t('expository.passes.fidelity.subtitle') as string}
                    state="pending"
                    t={t}
                />
            </main>
        </div>
    );
}

function SetupCard({
    bookId,
    onBookIdChange,
    targetCount,
    onTargetCountChange,
    lang,
    allBooks,
    t,
}: {
    bookId: BibleBookId;
    onBookIdChange: (id: BibleBookId) => void;
    targetCount: number | '';
    onTargetCountChange: (n: number | '') => void;
    lang: 'es' | 'en';
    allBooks: ReadonlyArray<{ id: BibleBookId; nameEs: string; nameEn: string; testament: 'OT' | 'NT' }>;
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
                        className="mt-1.5 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
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
                    disabled
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 disabled:opacity-50"
                    title={t('expository.setup.startDisabledHint') as string}
                >
                    {t('expository.setup.start')}
                </Button>
            </div>
        </section>
    );
}

type PassState = 'pending' | 'running' | 'done' | 'error';

function PassCard({
    index,
    title,
    subtitle,
    state,
    t,
}: {
    index: number;
    title: string;
    subtitle: string;
    state: PassState;
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
