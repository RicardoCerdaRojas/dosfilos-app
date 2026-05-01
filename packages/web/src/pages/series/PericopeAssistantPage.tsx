import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
    ArrowLeft,
    BookOpenText,
    Loader2,
    Sparkles,
    Wand2,
    Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/i18n';
import { useFirebase } from '@/context/firebase-context';
import { seriesService } from '@dosfilos/application';
import {
    getAllBooks,
    type BibleBookId,
    type DetectedPericope,
    type PericopeDetectionOutput,
} from '@dosfilos/domain';

/**
 * Wizard page for the pericope-driven expository series flow.
 *
 * v1 single-page flow:
 *   1. Pick a book + optional target count → run detector.
 *   2. Review the returned pericopes (edit titles inline, drop unwanted ones).
 *   3. Pick a start date + frequency → "Crear serie".
 *
 * The wizard memoizes the detector output via React state — re-running
 * the detector only happens if the user clicks "Detectar de nuevo". The
 * memo lives in component state because v1 doesn't persist anything
 * until the user accepts; once persisted the
 * `series.metadata.expository.pericopeAssistantVersion` carries the
 * fingerprint.
 */
export function PericopeAssistantPage() {
    const navigate = useNavigate();
    const { user } = useFirebase();
    const { t, i18n } = useTranslation('series');
    const lang: 'es' | 'en' = i18n.language?.split('-')[0] === 'en' ? 'en' : 'es';

    const allBooks = useMemo(() => getAllBooks(), []);
    const [bookId, setBookId] = useState<BibleBookId>('2PE');
    const [targetCount, setTargetCount] = useState<number | ''>('');
    const [seriesTitle, setSeriesTitle] = useState('');
    const [startDate, setStartDate] = useState<string>('');
    const [frequency, setFrequency] = useState<'weekly' | 'biweekly' | 'monthly' | 'flexible'>('weekly');

    const [detection, setDetection] = useState<PericopeDetectionOutput | null>(null);
    const [pericopes, setPericopes] = useState<DetectedPericope[]>([]);
    const [detecting, setDetecting] = useState(false);
    const [creating, setCreating] = useState(false);

    const selectedBook = allBooks.find(b => b.id === bookId);

    const handleDetect = async () => {
        setDetecting(true);
        setDetection(null);
        setPericopes([]);
        try {
            const result = await seriesService.runPericopeAssistant({
                bookId,
                displayLanguage: lang,
                targetPericopeCount: typeof targetCount === 'number' ? targetCount : undefined,
            });
            setDetection(result);
            setPericopes(result.pericopes);
            if (!seriesTitle && selectedBook) {
                setSeriesTitle(
                    t('pericope.defaultSeriesTitle', {
                        book: lang === 'en' ? selectedBook.nameEn : selectedBook.nameEs,
                    }) as string,
                );
            }
            toast.success(
                t('pericope.toast.detected', { count: result.pericopes.length }) as string,
            );
        } catch (err: any) {
            console.error('[pericope] detect failed:', err);
            const msg = err?.isExegesisOverload
                ? t('pericope.toast.overloaded')
                : t('pericope.toast.detectFailed');
            toast.error(msg as string);
        } finally {
            setDetecting(false);
        }
    };

    const handleEditTitle = (index: number, title: string) => {
        setPericopes(prev =>
            prev.map((p, i) => (i === index ? { ...p, suggestedTitle: title } : p)),
        );
    };

    const handleRemove = (index: number) => {
        setPericopes(prev => prev.filter((_, i) => i !== index));
    };

    const handleCreateSeries = async () => {
        if (!user?.uid || pericopes.length === 0 || !selectedBook) return;
        if (!seriesTitle.trim()) {
            toast.error(t('pericope.toast.titleRequired') as string);
            return;
        }
        setCreating(true);
        try {
            const bookDisplay = lang === 'en' ? selectedBook.nameEn : selectedBook.nameEs;
            const sermons = pericopes.map((p, idx) => ({
                title: p.suggestedTitle,
                description: p.unit.justification ?? '',
                passage: formatPassage(bookDisplay, p.unit),
                week: idx + 1,
                syntacticUnit: p.unit,
                status: 'planned' as const,
            }));

            const series = await seriesService.createSeriesFromPlan(user.uid, {
                series: {
                    title: seriesTitle.trim(),
                    description:
                        t('pericope.defaultSeriesDescription', {
                            book: bookDisplay,
                            count: pericopes.length,
                        }) as string,
                    type: 'expository',
                    startDate: startDate ? new Date(startDate) : undefined,
                    metadata: {
                        expository: { book: bookDisplay },
                    },
                    resourceIds: [],
                },
                sermons,
                frequency,
                expositoryAssistant: detection
                    ? { version: detection.outputVersion, status: 'reviewed' }
                    : undefined,
            });

            toast.success(t('pericope.toast.seriesCreated') as string);
            navigate(`/dashboard/plans/${series.id}`);
        } catch (err: any) {
            console.error('[pericope] createSeries failed:', err);
            toast.error(err?.message ?? (t('pericope.toast.createFailed') as string));
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-zinc-950/50 overflow-y-auto">
            {/* Header */}
            <div className="border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-4">
                <div className="max-w-5xl mx-auto flex items-center gap-3">
                    <Link
                        to="/dashboard/plans"
                        className="inline-flex items-center justify-center h-8 w-8 rounded-md text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                        aria-label={t('pericope.back') as string}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100 font-serif truncate">
                            {t('pericope.title')}
                        </h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {t('pericope.subtitle')}
                        </p>
                    </div>
                </div>
            </div>

            <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-8 space-y-6">
                {/* Detection setup */}
                <section className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
                    <header className="mb-4">
                        <div className="flex items-center gap-2 mb-1">
                            <BookOpenText className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                                {t('pericope.setup.title')}
                            </h2>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {t('pericope.setup.subtitle')}
                        </p>
                    </header>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                            <Label htmlFor="book">{t('pericope.setup.book')}</Label>
                            <select
                                id="book"
                                value={bookId}
                                onChange={(e) => setBookId(e.target.value as BibleBookId)}
                                className="mt-1.5 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                            >
                                <optgroup label={t('pericope.setup.testamentNT') as string}>
                                    {allBooks.filter(b => b.testament === 'NT').map(b => (
                                        <option key={b.id} value={b.id}>
                                            {lang === 'en' ? b.nameEn : b.nameEs}
                                        </option>
                                    ))}
                                </optgroup>
                                <optgroup label={t('pericope.setup.testamentOT') as string}>
                                    {allBooks.filter(b => b.testament === 'OT').map(b => (
                                        <option key={b.id} value={b.id}>
                                            {lang === 'en' ? b.nameEn : b.nameEs}
                                        </option>
                                    ))}
                                </optgroup>
                            </select>
                        </div>
                        <div>
                            <Label htmlFor="target">{t('pericope.setup.targetCount')}</Label>
                            <Input
                                id="target"
                                type="number"
                                min={3}
                                max={60}
                                value={targetCount}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    setTargetCount(v === '' ? '' : Math.max(1, Number(v)));
                                }}
                                placeholder={t('pericope.setup.targetCountPlaceholder') as string}
                                className="mt-1.5"
                            />
                        </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                        <p className="text-[11px] text-amber-700 dark:text-amber-300 max-w-md">
                            {t('pericope.setup.translationNote')}
                        </p>
                        <Button
                            onClick={handleDetect}
                            disabled={detecting}
                            className="bg-emerald-500 hover:bg-emerald-400 text-slate-900"
                        >
                            {detecting ? (
                                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                            ) : (
                                <Sparkles className="h-4 w-4 mr-1.5" />
                            )}
                            {detecting
                                ? t('pericope.setup.detecting')
                                : detection
                                  ? t('pericope.setup.detectAgain')
                                  : t('pericope.setup.detect')}
                        </Button>
                    </div>
                </section>

                {/* Pericope review */}
                {pericopes.length > 0 && (
                    <section className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
                        <header className="mb-4">
                            <div className="flex items-center gap-2 mb-1">
                                <Wand2 className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                                <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                                    {t('pericope.review.title', { count: pericopes.length })}
                                </h2>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {t('pericope.review.subtitle')}
                            </p>
                        </header>

                        <ul className="space-y-3">
                            {pericopes.map((p, index) => (
                                <li
                                    key={`${p.unit.chapterStart}:${p.unit.verseStart}-${index}`}
                                    className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40 p-4"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="shrink-0 w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-xs font-semibold">
                                            {index + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <Input
                                                value={p.suggestedTitle}
                                                onChange={(e) => handleEditTitle(index, e.target.value)}
                                                className="text-sm font-medium"
                                            />
                                            <p className="mt-2 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                                                {selectedBook
                                                    ? formatPassage(
                                                          lang === 'en' ? selectedBook.nameEn : selectedBook.nameEs,
                                                          p.unit,
                                                      )
                                                    : ''}
                                            </p>
                                            {p.unit.justification && (
                                                <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 italic">
                                                    {p.unit.justification}
                                                </p>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleRemove(index)}
                                            className="p-1.5 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                                            aria-label={t('pericope.review.remove') as string}
                                            title={t('pericope.review.remove') as string}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                {/* Series creation */}
                {pericopes.length > 0 && (
                    <section className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
                        <header className="mb-4">
                            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-1">
                                {t('pericope.create.title')}
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {t('pericope.create.subtitle')}
                            </p>
                        </header>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <Label htmlFor="seriesTitle">{t('pericope.create.seriesTitle')}</Label>
                                <Input
                                    id="seriesTitle"
                                    value={seriesTitle}
                                    onChange={(e) => setSeriesTitle(e.target.value)}
                                    className="mt-1.5"
                                />
                            </div>
                            <div>
                                <Label htmlFor="startDate">{t('pericope.create.startDate')}</Label>
                                <Input
                                    id="startDate"
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="mt-1.5"
                                />
                            </div>
                            <div>
                                <Label htmlFor="frequency">{t('pericope.create.frequency')}</Label>
                                <select
                                    id="frequency"
                                    value={frequency}
                                    onChange={(e) =>
                                        setFrequency(e.target.value as typeof frequency)
                                    }
                                    className="mt-1.5 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                                >
                                    <option value="weekly">{t('pericope.create.freq.weekly')}</option>
                                    <option value="biweekly">{t('pericope.create.freq.biweekly')}</option>
                                    <option value="monthly">{t('pericope.create.freq.monthly')}</option>
                                    <option value="flexible">{t('pericope.create.freq.flexible')}</option>
                                </select>
                            </div>
                        </div>

                        <div className="mt-5 flex justify-end">
                            <Button
                                onClick={handleCreateSeries}
                                disabled={creating || pericopes.length === 0}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                            >
                                {creating && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                                {t('pericope.create.cta', { count: pericopes.length })}
                            </Button>
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}

function formatPassage(
    bookDisplay: string,
    unit: { chapterStart: number; verseStart: number; chapterEnd: number; verseEnd: number },
): string {
    const { chapterStart, verseStart, chapterEnd, verseEnd } = unit;
    if (chapterStart === chapterEnd) {
        if (verseStart === verseEnd) return `${bookDisplay} ${chapterStart}:${verseStart}`;
        return `${bookDisplay} ${chapterStart}:${verseStart}-${verseEnd}`;
    }
    return `${bookDisplay} ${chapterStart}:${verseStart}-${chapterEnd}:${verseEnd}`;
}
