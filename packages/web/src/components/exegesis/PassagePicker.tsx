import { useEffect, useMemo, useState } from 'react';
import { Type, ListFilter, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';
import {
    parsePassageReference,
    formatPassageReference,
    type PassageReference,
    type ParseResult,
} from '@dosfilos/domain';
import { BiblePassageBuilder } from './BiblePassageBuilder';

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
    /**
     * Defaults to 'picker' — the structured form is the primary input
     * surface because typos in book names / verse numbers were the
     * leading cause of bad PassageReferences in v1. Free-text remains
     * available via the mode toggle for users who prefer typing
     * "Heb 1:1-4" directly.
     */
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
    initialMode = 'picker',
    displayLanguage,
}: PassagePickerProps) {
    const { t, i18n } = useTranslation('exegesis');
    const lang = displayLanguage ?? (i18n.language?.split('-')[0] === 'en' ? 'en' : 'es');

    // Sticky mode preference: once the user picks a mode, remember it
    // for next session. Only honored when the caller didn't pin
    // `initialMode` explicitly. Falls back to the prop default
    // (`picker`) when storage is unavailable or empty.
    const [mode, setMode] = useState<Mode>(() => readStoredMode() ?? initialMode);

    // Free-text mode state
    const [freeText, setFreeText] = useState<string>(
        value ? formatPassageReference(value, lang) : ''
    );

    // Picker mode state — driven entirely by BiblePassageBuilder.
    // The builder owns the per-stage state internally; we just keep
    // the latest `ParseResult` it surfaced via `onResult` so the
    // feedback line + parent push can read from the same source.
    const [pickerResult, setPickerResult] = useState<ParseResult | null>(null);

    // ── Free-text parsing ───────────────────────────────────────────────
    const freeTextResult: ParseResult | null = useMemo(() => {
        if (mode !== 'free-text') return null;
        if (!freeText.trim()) return null;
        return parsePassageReference(freeText);
    }, [mode, freeText]);

    // Push results upward — single effect for both modes.
    useEffect(() => {
        const result = mode === 'free-text' ? freeTextResult : pickerResult;
        if (result === null) {
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

    // When the user switches modes, sync the free-text input from the
    // last good builder result so the toggle is non-destructive.
    // Builder mounts fresh from `value` each time, so going free-text
    // → builder is handled by its own initialization.
    const switchMode = (next: Mode) => {
        if (next === mode) return;
        if (next === 'free-text') {
            const current = pickerResult?.ok ? pickerResult.ref : value;
            if (current) setFreeText(formatPassageReference(current, lang));
        }
        setMode(next);
        writeStoredMode(next);
    };

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
                <BiblePassageBuilder
                    value={value}
                    onResult={setPickerResult}
                    displayLanguage={lang}
                    t={t}
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

// ── Sticky mode preference ──────────────────────────────────────────

const STORAGE_KEY = 'exegesis.passagePickerMode';

function readStoredMode(): Mode | null {
    if (typeof window === 'undefined') return null;
    try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        return stored === 'free-text' || stored === 'picker' ? stored : null;
    } catch {
        return null;
    }
}

function writeStoredMode(mode: Mode): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
        // localStorage may be disabled (private mode, quota); the
        // user's choice still applies for the current session via
        // component state.
    }
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
