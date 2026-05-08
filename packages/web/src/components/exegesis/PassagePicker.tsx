import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, Pencil, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';
import {
    formatPassageReference,
    type PassageReference,
    type ParseResult,
} from '@dosfilos/domain';
import { BiblePassageBuilder } from './BiblePassageBuilder';

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
    /** Lock the language used for book display labels. Defaults to UI language. */
    displayLanguage?: 'es' | 'en';
}

/**
 * Inline passage picker for the exegesis setup wizard.
 *
 * Single integrated drill-down (book → chapter → verse) with a search
 * bar that also parses freeform refs ("Heb 12:1-2"). The builder body
 * collapses automatically once the user finishes a complete selection
 * (verse range set), and re-expands when they click the summary chip
 * to edit. No popover — everything stays in the wizard step's flow.
 */
export function PassagePicker({
    value,
    onChange,
    displayLanguage,
}: PassagePickerProps) {
    const { t, i18n } = useTranslation('exegesis');
    const lang = displayLanguage ?? (i18n.language?.split('-')[0] === 'en' ? 'en' : 'es');

    const [result, setResult] = useState<ParseResult | null>(null);
    const [expanded, setExpanded] = useState<boolean>(value === null);
    // Reset signal: bumping this prop forces the builder to re-mount
    // with the current `value`, useful when the user re-opens after
    // collapsing so stale internal stage state doesn't survive.
    const [resetSignal, setResetSignal] = useState(0);
    const previousResultRef = useRef<ParseResult | null>(null);

    // Push results upward + auto-collapse on a complete result.
    useEffect(() => {
        if (result === null) {
            onChange(null);
            return;
        }
        if (result.ok) {
            onChange(result.ref);
            // Auto-collapse only on transitions to a NEW complete ref —
            // not while the user is still editing. A complete ref is
            // one with a non-null verseStart (verseEnd defaults to
            // verseStart for single-verse picks, both signal "done").
            const becameComplete =
                previousResultRef.current?.ok !== true ||
                !sameRef(previousResultRef.current.ref, result.ref);
            if (result.ref.verseStart !== null && becameComplete) {
                setExpanded(false);
            }
        } else {
            onChange(null, { code: result.error, hint: result.hint });
        }
        previousResultRef.current = result;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [result]);

    const handleEdit = () => {
        setResetSignal((s) => s + 1);
        setExpanded(true);
    };

    return (
        <div className="space-y-2">
            {/* Summary chip — visible always so the user always sees the
                current selection. Clickable to re-open the builder. */}
            <PassageSummary
                value={value}
                lang={lang}
                expanded={expanded}
                onEdit={handleEdit}
                t={t}
            />

            {expanded && (
                <BiblePassageBuilder
                    key={resetSignal}
                    value={value}
                    onResult={setResult}
                    displayLanguage={lang}
                    t={t}
                />
            )}

            <FeedbackLine result={result} value={value} lang={lang} t={t} />
        </div>
    );
}

function sameRef(a: PassageReference, b: PassageReference): boolean {
    return a.bookId === b.bookId
        && a.chapterStart === b.chapterStart
        && a.chapterEnd === b.chapterEnd
        && a.verseStart === b.verseStart
        && a.verseEnd === b.verseEnd;
}

function PassageSummary({
    value,
    lang,
    expanded,
    onEdit,
    t,
}: {
    value: PassageReference | null;
    lang: 'es' | 'en';
    expanded: boolean;
    onEdit: () => void;
    t: (key: string, opts?: Record<string, unknown>) => string;
}) {
    if (!value) {
        return null;
    }
    return (
        <div
            className={cn(
                'inline-flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors',
                expanded
                    ? 'border-emerald-300 bg-emerald-50/40 dark:border-emerald-800 dark:bg-emerald-950/20'
                    : 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40',
            )}
        >
            <BookOpen className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-[14px] font-semibold text-emerald-900 dark:text-emerald-100 tabular-nums">
                {formatPassageReference(value, lang)}
            </span>
            {!expanded && (
                <button
                    type="button"
                    onClick={onEdit}
                    className="ml-1 inline-flex items-center gap-1 text-[12px] text-emerald-700 dark:text-emerald-300 hover:underline"
                >
                    <Pencil className="h-3 w-3" />
                    {t('setup.passage.edit')}
                </button>
            )}
        </div>
    );
}

function FeedbackLine({
    result,
    value,
    lang,
    t,
}: {
    result: ParseResult | null;
    value: PassageReference | null;
    lang: 'es' | 'en';
    t: (key: string) => string;
}) {
    // Empty state — no result yet, no value. Hint the user.
    if (result === null && value === null) {
        return (
            <p className="text-xs text-slate-400 dark:text-slate-500">
                {t('setup.passage.helperHint')}
            </p>
        );
    }
    // Error state — only show when the user is actively editing
    // (otherwise a stale error from a half-typed search lingers
    // after a successful pick).
    if (result && !result.ok) {
        return (
            <p className="inline-flex items-start gap-1.5 text-xs font-medium text-rose-700 dark:text-rose-300">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>{result.hint}</span>
            </p>
        );
    }
    // Success state — small confirmation. Same copy as the existing
    // wizard, just rendered after the summary chip.
    const ok = result?.ok ? result.ref : value;
    if (!ok) return null;
    return (
        <p className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>
                {t('setup.passage.parsedAs')} <strong>{formatPassageReference(ok, lang)}</strong>
            </span>
        </p>
    );
}
