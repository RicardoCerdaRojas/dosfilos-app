import { useEffect, useMemo, useState } from 'react';
import { Type, ListFilter, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';
import {
    parsePassageReference,
    buildPassageReference,
    formatPassageReference,
    getAllBooks,
    type PassageReference,
    type ParseResult,
    type BibleBookId,
    type BibleCanonBook,
} from '@dosfilos/domain';

type Mode = 'free-text' | 'picker';

export interface PassagePickerProps {
    /** Current parsed passage (if any). The parent owns the state. */
    value: PassageReference | null;
    /**
     * Called whenever the user produces a (possibly-invalid) result. When
     * the input parses cleanly, `error` is undefined and `ref` is set;
     * when it doesn't, `ref` is null and `error` describes the problem.
     * The parent decides whether to enable downstream UI based on `ref`.
     */
    onChange: (ref: PassageReference | null, error?: { code: string; hint: string }) => void;
    /** Defaults to 'free-text'. Persists across renders inside the component. */
    initialMode?: Mode;
    /** Lock the language used for book display labels. Defaults to UI language. */
    displayLanguage?: 'es' | 'en';
}

/**
 * Dual-mode passage picker for the exegesis setup wizard.
 *
 * Modes:
 *   - 'free-text': single input parsed via `parsePassageReference`. Tolerant
 *     of accents, abbreviations, dot vs colon separators, en/em dashes,
 *     and Roman/Arabic numerals for numbered books. Real-time feedback
 *     (valid preview when parsable, hint when not).
 *   - 'picker': book dropdown (grouped by testament) + chapter + optional
 *     verse range. Output is built via `buildPassageReference` against the
 *     same canonical data, so both modes converge on identical
 *     `PassageReference` shapes.
 *
 * Both modes feed `onChange` with the parsed value or the failure hint.
 * The component is purely controlled — internal state covers only the
 * active mode and the in-flight inputs (so the user can correct typos
 * without losing them when toggling between modes).
 */
export function PassagePicker({
    value,
    onChange,
    initialMode = 'free-text',
    displayLanguage,
}: PassagePickerProps) {
    const { t, i18n } = useTranslation('exegesis');
    const lang = displayLanguage ?? (i18n.language?.split('-')[0] === 'en' ? 'en' : 'es');

    const [mode, setMode] = useState<Mode>(initialMode);

    // Free-text mode state
    const [freeText, setFreeText] = useState<string>(
        value ? formatPassageReference(value, lang) : ''
    );

    // Picker mode state
    const [pickerBookId, setPickerBookId] = useState<BibleBookId | ''>(value?.bookId ?? '');
    const [pickerChapterStart, setPickerChapterStart] = useState<string>(value ? String(value.chapterStart) : '');
    const [pickerChapterEnd, setPickerChapterEnd] = useState<string>(
        value && value.chapterEnd !== value.chapterStart ? String(value.chapterEnd) : ''
    );
    const [pickerVerseStart, setPickerVerseStart] = useState<string>(value?.verseStart ? String(value.verseStart) : '');
    const [pickerVerseEnd, setPickerVerseEnd] = useState<string>(value?.verseEnd ? String(value.verseEnd) : '');

    const allBooks = useMemo(() => getAllBooks(), []);
    const otBooks = useMemo(() => allBooks.filter(b => b.testament === 'OT'), [allBooks]);
    const ntBooks = useMemo(() => allBooks.filter(b => b.testament === 'NT'), [allBooks]);

    // ── Free-text parsing ───────────────────────────────────────────────
    const freeTextResult: ParseResult | null = useMemo(() => {
        if (mode !== 'free-text') return null;
        if (!freeText.trim()) return null;
        return parsePassageReference(freeText);
    }, [mode, freeText]);

    // ── Picker building ─────────────────────────────────────────────────
    const pickerResult: ParseResult | null = useMemo(() => {
        if (mode !== 'picker') return null;
        if (!pickerBookId || !pickerChapterStart) return null;
        const chStart = parseInt(pickerChapterStart, 10);
        if (!Number.isFinite(chStart)) return null;
        const chEnd = pickerChapterEnd ? parseInt(pickerChapterEnd, 10) : chStart;
        const vStart = pickerVerseStart ? parseInt(pickerVerseStart, 10) : null;
        const vEnd = pickerVerseEnd ? parseInt(pickerVerseEnd, 10) : (vStart ?? null);
        return buildPassageReference({
            bookId: pickerBookId as BibleBookId,
            chapterStart: chStart,
            chapterEnd: chEnd,
            verseStart: vStart,
            verseEnd: vEnd,
        });
    }, [mode, pickerBookId, pickerChapterStart, pickerChapterEnd, pickerVerseStart, pickerVerseEnd]);

    // Push results upward — single effect for both modes.
    useEffect(() => {
        const result = mode === 'free-text' ? freeTextResult : pickerResult;
        if (result === null) {
            // Empty input → null with no error (parent disables CTA, no message yet).
            onChange(null);
            return;
        }
        if (result.ok) {
            onChange(result.ref);
        } else {
            onChange(null, { code: result.error, hint: result.hint });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, freeTextResult, pickerResult]);

    // When the user switches modes, sync the OTHER mode's fields to the
    // current value so the toggle is non-destructive.
    const switchMode = (next: Mode) => {
        if (next === mode) return;
        const current = mode === 'free-text' ? freeTextResult : pickerResult;
        if (current?.ok) {
            const ref = current.ref;
            if (next === 'free-text') {
                setFreeText(formatPassageReference(ref, lang));
            } else {
                setPickerBookId(ref.bookId);
                setPickerChapterStart(String(ref.chapterStart));
                setPickerChapterEnd(ref.chapterEnd !== ref.chapterStart ? String(ref.chapterEnd) : '');
                setPickerVerseStart(ref.verseStart !== null ? String(ref.verseStart) : '');
                setPickerVerseEnd(ref.verseEnd !== null ? String(ref.verseEnd) : '');
            }
        }
        setMode(next);
    };

    const selectedBook: BibleCanonBook | null = useMemo(() => {
        if (!pickerBookId) return null;
        return allBooks.find(b => b.id === pickerBookId) ?? null;
    }, [pickerBookId, allBooks]);

    const labelFor = (b: BibleCanonBook) => (lang === 'en' ? b.nameEn : b.nameEs);

    return (
        <div className="space-y-3">
            {/* Mode toggle */}
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-900 p-0.5">
                <ModeButton active={mode === 'free-text'} onClick={() => switchMode('free-text')} icon={<Type className="h-3.5 w-3.5" />}>
                    {t('setup.passage.modeFreeText')}
                </ModeButton>
                <ModeButton active={mode === 'picker'} onClick={() => switchMode('picker')} icon={<ListFilter className="h-3.5 w-3.5" />}>
                    {t('setup.passage.modePicker')}
                </ModeButton>
            </div>

            {/* Mode body */}
            {mode === 'free-text' ? (
                <FreeTextMode
                    value={freeText}
                    onChange={setFreeText}
                    placeholder={t('setup.passage.freeTextPlaceholder')}
                />
            ) : (
                <PickerMode
                    otBooks={otBooks}
                    ntBooks={ntBooks}
                    labelFor={labelFor}
                    bookId={pickerBookId}
                    onBookChange={(id) => {
                        setPickerBookId(id);
                        // Reset numeric fields when book changes; the user almost
                        // always means a different chapter/verse for a new book.
                        setPickerChapterStart('');
                        setPickerChapterEnd('');
                        setPickerVerseStart('');
                        setPickerVerseEnd('');
                    }}
                    selectedBook={selectedBook}
                    chapterStart={pickerChapterStart}
                    chapterEnd={pickerChapterEnd}
                    verseStart={pickerVerseStart}
                    verseEnd={pickerVerseEnd}
                    onChapterStartChange={setPickerChapterStart}
                    onChapterEndChange={setPickerChapterEnd}
                    onVerseStartChange={setPickerVerseStart}
                    onVerseEndChange={setPickerVerseEnd}
                    t={t}
                    pickBookLabel={t('setup.passage.pickBook')}
                    otGroupLabel={t('setup.passage.testamentOt')}
                    ntGroupLabel={t('setup.passage.testamentNt')}
                />
            )}

            {/* Feedback */}
            <FeedbackLine
                result={mode === 'free-text' ? freeTextResult : pickerResult}
                lang={lang}
                t={t}
            />
        </div>
    );
}

function ModeButton({
    active,
    onClick,
    icon,
    children,
}: {
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                active
                    ? 'bg-white dark:bg-zinc-800 text-slate-800 dark:text-slate-100 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            )}
        >
            {icon}
            {children}
        </button>
    );
}

function FreeTextMode({
    value,
    onChange,
    placeholder,
}: {
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
}) {
    return (
        <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2.5 text-[15px] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
            spellCheck={false}
            autoComplete="off"
        />
    );
}

interface PickerModeProps {
    otBooks: BibleCanonBook[];
    ntBooks: BibleCanonBook[];
    labelFor: (b: BibleCanonBook) => string;
    bookId: BibleBookId | '';
    onBookChange: (id: BibleBookId | '') => void;
    selectedBook: BibleCanonBook | null;
    chapterStart: string;
    chapterEnd: string;
    verseStart: string;
    verseEnd: string;
    onChapterStartChange: (v: string) => void;
    onChapterEndChange: (v: string) => void;
    onVerseStartChange: (v: string) => void;
    onVerseEndChange: (v: string) => void;
    t: (key: string) => string;
    pickBookLabel: string;
    otGroupLabel: string;
    ntGroupLabel: string;
}

function PickerMode({
    otBooks,
    ntBooks,
    labelFor,
    bookId,
    onBookChange,
    selectedBook,
    chapterStart,
    chapterEnd,
    verseStart,
    verseEnd,
    onChapterStartChange,
    onChapterEndChange,
    onVerseStartChange,
    onVerseEndChange,
    t,
    pickBookLabel,
    otGroupLabel,
    ntGroupLabel,
}: PickerModeProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr] gap-2">
            {/* Book — native <select> with optgroup is the simplest accessible
                way to handle 66 entries grouped by testament. */}
            <select
                value={bookId}
                onChange={(e) => onBookChange(e.target.value as BibleBookId | '')}
                className="rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2.5 text-[15px] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
            >
                <option value="">{pickBookLabel}</option>
                <optgroup label={otGroupLabel}>
                    {otBooks.map(b => (
                        <option key={b.id} value={b.id}>{labelFor(b)}</option>
                    ))}
                </optgroup>
                <optgroup label={ntGroupLabel}>
                    {ntBooks.map(b => (
                        <option key={b.id} value={b.id}>{labelFor(b)}</option>
                    ))}
                </optgroup>
            </select>

            <NumberPair
                startLabel={t('setup.passage.chapter')}
                endLabel={t('setup.passage.chapterEnd')}
                startValue={chapterStart}
                endValue={chapterEnd}
                onStartChange={onChapterStartChange}
                onEndChange={onChapterEndChange}
                max={selectedBook?.chapterCount}
                disabled={!selectedBook}
            />

            <NumberPair
                startLabel={t('setup.passage.verse')}
                endLabel={t('setup.passage.verseEnd')}
                startValue={verseStart}
                endValue={verseEnd}
                onStartChange={onVerseStartChange}
                onEndChange={onVerseEndChange}
                disabled={!selectedBook || !chapterStart}
            />
        </div>
    );
}

function NumberPair({
    startLabel,
    endLabel,
    startValue,
    endValue,
    onStartChange,
    onEndChange,
    max,
    disabled,
}: {
    startLabel: string;
    endLabel: string;
    startValue: string;
    endValue: string;
    onStartChange: (v: string) => void;
    onEndChange: (v: string) => void;
    max?: number;
    disabled?: boolean;
}) {
    return (
        <div className="flex items-stretch gap-1">
            <input
                type="number"
                inputMode="numeric"
                min={1}
                max={max}
                value={startValue}
                onChange={(e) => onStartChange(e.target.value)}
                placeholder={startLabel}
                disabled={disabled}
                className="w-full min-w-0 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2.5 py-2.5 text-[15px] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <span className="self-center text-slate-400 px-0.5">–</span>
            <input
                type="number"
                inputMode="numeric"
                min={1}
                max={max}
                value={endValue}
                onChange={(e) => onEndChange(e.target.value)}
                placeholder={endLabel}
                disabled={disabled}
                className="w-full min-w-0 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2.5 py-2.5 text-[15px] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
        </div>
    );
}

function FeedbackLine({
    result,
    lang,
    t,
}: {
    result: ParseResult | null;
    lang: 'es' | 'en';
    t: (key: string) => string;
}) {
    if (result === null) {
        return <p className="text-xs text-slate-400 dark:text-slate-500">{t('setup.passage.helperHint')}</p>;
    }
    if (result.ok) {
        return (
            <p className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>
                    {t('setup.passage.parsedAs')} <strong>{formatPassageReference(result.ref, lang)}</strong>
                </span>
            </p>
        );
    }
    return (
        <p className="inline-flex items-start gap-1.5 text-xs font-medium text-rose-700 dark:text-rose-300">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>{result.hint}</span>
        </p>
    );
}
