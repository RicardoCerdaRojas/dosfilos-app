import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';
import {
    getAllBooks,
    type BibleBookId,
    type BibleCanonBook,
} from '@dosfilos/domain';

export interface BookPickerProps {
    /** Currently selected book id (controlled). */
    value: BibleBookId | null;
    onChange: (bookId: BibleBookId) => void;
    /** Lock the language used for book labels. Defaults to UI language. */
    displayLanguage?: 'es' | 'en';
    disabled?: boolean;
    /** Optional class to merge into the trigger button. */
    className?: string;
}

/**
 * Date-picker-style book selector. The trigger reads as a button with the
 * current book name (or a placeholder when empty). Focusing/clicking opens
 * an inline panel underneath with:
 *   - typeahead search (filters by id, ES name, EN name, aliases)
 *   - OT / NT grouped grid of book buttons
 *
 * Extracted from `BiblePassageBuilder.BookStage` so the expository
 * wizard's "whole book" mode can drop the native `<select>` for the
 * same nicer UX the passage picker offers.
 *
 * Closes on:
 *   - book pick (auto-commit)
 *   - click outside the container
 *   - Escape key
 */
export function BookPicker({
    value,
    onChange,
    displayLanguage,
    disabled,
    className,
}: BookPickerProps) {
    const { t, i18n } = useTranslation('exegesis');
    const lang = displayLanguage ?? (i18n.language?.split('-')[0] === 'en' ? 'en' : 'es');
    const allBooks = useMemo(() => getAllBooks(), []);
    const labelFor = (b: BibleCanonBook) => (lang === 'en' ? b.nameEn : b.nameEs);
    const selectedBook = useMemo(
        () => (value ? allBooks.find((b) => b.id === value) ?? null : null),
        [value, allBooks],
    );

    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const containerRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent | TouchEvent) => {
            const node = containerRef.current;
            if (!node) return;
            if (e.target instanceof Node && node.contains(e.target)) return;
            setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        document.addEventListener('touchstart', handler);
        return () => {
            document.removeEventListener('mousedown', handler);
            document.removeEventListener('touchstart', handler);
        };
    }, [open]);

    useEffect(() => {
        if (open) inputRef.current?.focus();
    }, [open]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return allBooks;
        return allBooks.filter(
            (b) =>
                b.id.toLowerCase().includes(q) ||
                b.nameEs.toLowerCase().includes(q) ||
                b.nameEn.toLowerCase().includes(q) ||
                b.aliases.some((a) => a.toLowerCase().includes(q)),
        );
    }, [allBooks, query]);
    const ot = filtered.filter((b) => b.testament === 'OT');
    const nt = filtered.filter((b) => b.testament === 'NT');

    const handlePick = (id: BibleBookId) => {
        onChange(id);
        setOpen(false);
        setQuery('');
    };

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                onClick={() => !disabled && setOpen((v) => !v)}
                disabled={disabled}
                className={cn(
                    'inline-flex w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 h-10 text-sm text-foreground hover:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                    className,
                )}
            >
                <span className="inline-flex items-center gap-2 min-w-0">
                    <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className={cn('truncate', !selectedBook && 'text-muted-foreground')}>
                        {selectedBook ? labelFor(selectedBook) : t('setup.passage.pickBook')}
                    </span>
                </span>
            </button>

            {open && (
                <div className="absolute z-50 mt-1 w-full min-w-[320px] rounded-lg border border-border bg-popover text-popover-foreground shadow-lg p-3">
                    <div className="relative mb-2">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') setOpen(false);
                            }}
                            placeholder={t('setup.passage.searchBook') as string}
                            spellCheck={false}
                            autoComplete="off"
                            className="w-full rounded-md border border-input bg-background pl-8 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                        {query && (
                            <button
                                type="button"
                                onClick={() => {
                                    setQuery('');
                                    inputRef.current?.focus();
                                }}
                                aria-label={t('setup.passage.clear') as string}
                                className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[340px] overflow-y-auto pr-1">
                        {ot.length > 0 && (
                            <div className="col-span-full">
                                <p className="text-[10px] uppercase tracking-[0.15em] font-semibold text-muted-foreground mb-1">
                                    {t('setup.passage.testamentOt')}
                                </p>
                            </div>
                        )}
                        {ot.map((b) => (
                            <BookButton
                                key={b.id}
                                label={labelFor(b)}
                                selected={value === b.id}
                                onClick={() => handlePick(b.id)}
                            />
                        ))}
                        {nt.length > 0 && (
                            <div className="col-span-full mt-2">
                                <p className="text-[10px] uppercase tracking-[0.15em] font-semibold text-muted-foreground mb-1">
                                    {t('setup.passage.testamentNt')}
                                </p>
                            </div>
                        )}
                        {nt.map((b) => (
                            <BookButton
                                key={b.id}
                                label={labelFor(b)}
                                selected={value === b.id}
                                onClick={() => handlePick(b.id)}
                            />
                        ))}
                        {filtered.length === 0 && (
                            <p className="col-span-full text-center text-xs text-muted-foreground py-6">—</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function BookButton({
    label,
    selected,
    onClick,
}: {
    label: string;
    selected: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'text-left rounded-md border px-2.5 py-1.5 text-[13px] transition-colors truncate',
                selected
                    ? 'border-primary bg-primary/10 text-foreground font-medium'
                    : 'border-input bg-background text-foreground hover:border-primary/60 hover:bg-accent',
            )}
        >
            {label}
        </button>
    );
}
