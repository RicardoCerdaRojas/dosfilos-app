import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { useTranslation } from '@/i18n';
import {
    BIBLE_CANON,
    getBookById,
    type BibleBookId,
} from '@dosfilos/domain';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface BibleBookMultiSelectProps {
    selected: ReadonlyArray<BibleBookId>;
    onChange: (next: ReadonlyArray<BibleBookId>) => void;
    /** Disable the picker (e.g. when scope is whole-bible / whole-testament). */
    disabled?: boolean;
}

/**
 * Multi-select picker over the 66-book canon, grouped by testament.
 * Selected books render as removable badges above; click the trigger
 * to open a searchable command palette and toggle membership.
 *
 * Built for the v1.7 metadata editor in the library, but kept generic
 * (no library-specific props) so the smart-match dialog can reuse it
 * in Sprint 2 without a refactor.
 */
export function BibleBookMultiSelect({
    selected,
    onChange,
    disabled = false,
}: BibleBookMultiSelectProps) {
    const { t, i18n } = useTranslation('library');
    const [open, setOpen] = useState(false);
    const isSpanish = i18n.language?.toLowerCase().startsWith('es');

    const selectedSet = useMemo(() => new Set(selected), [selected]);

    const grouped = useMemo(() => {
        const ot = BIBLE_CANON.filter(b => b.testament === 'OT');
        const nt = BIBLE_CANON.filter(b => b.testament === 'NT');
        return { ot, nt };
    }, []);

    const toggle = (id: BibleBookId) => {
        if (selectedSet.has(id)) {
            onChange(selected.filter(s => s !== id));
        } else {
            onChange([...selected, id]);
        }
    };

    const remove = (id: BibleBookId) => {
        onChange(selected.filter(s => s !== id));
    };

    const labelFor = (id: BibleBookId): string => {
        const book = getBookById(id);
        if (!book) return id;
        return isSpanish ? book.nameEs : book.nameEn;
    };

    return (
        <div className="space-y-2">
            {selected.length > 0 && (
                <div className="flex flex-wrap gap-1.5" role="list" aria-label={t('metadataEditor.selectedBooksLabel')}>
                    {selected.map(id => (
                        <Badge
                            key={id}
                            variant="secondary"
                            className="gap-1 pr-1 text-[11px]"
                            role="listitem"
                        >
                            {labelFor(id)}
                            <button
                                type="button"
                                onClick={() => remove(id)}
                                disabled={disabled}
                                className="rounded-sm hover:bg-foreground/10 focus:outline-none focus:ring-1 focus:ring-ring p-0.5"
                                aria-label={t('metadataEditor.removeBookAria', { book: labelFor(id) })}
                            >
                                <X className="h-3 w-3" aria-hidden />
                            </button>
                        </Badge>
                    ))}
                </div>
            )}
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        disabled={disabled}
                        className="w-full justify-between text-[12.5px] font-normal"
                    >
                        {selected.length === 0
                            ? t('metadataEditor.bookPickerPlaceholder')
                            : t('metadataEditor.bookPickerSelected', { count: selected.length })}
                        <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                        <CommandInput
                            placeholder={t('metadataEditor.bookSearchPlaceholder')}
                            className="text-[12.5px]"
                        />
                        <CommandList className="max-h-72">
                            <CommandEmpty>{t('metadataEditor.bookSearchEmpty')}</CommandEmpty>
                            <CommandGroup heading={t('metadataEditor.testamentOT')}>
                                {grouped.ot.map(book => (
                                    <BookRow
                                        key={book.id}
                                        bookId={book.id}
                                        label={isSpanish ? book.nameEs : book.nameEn}
                                        selected={selectedSet.has(book.id)}
                                        onSelect={toggle}
                                    />
                                ))}
                            </CommandGroup>
                            <CommandGroup heading={t('metadataEditor.testamentNT')}>
                                {grouped.nt.map(book => (
                                    <BookRow
                                        key={book.id}
                                        bookId={book.id}
                                        label={isSpanish ? book.nameEs : book.nameEn}
                                        selected={selectedSet.has(book.id)}
                                        onSelect={toggle}
                                    />
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    );
}

function BookRow({
    bookId,
    label,
    selected,
    onSelect,
}: {
    bookId: BibleBookId;
    label: string;
    selected: boolean;
    onSelect: (id: BibleBookId) => void;
}) {
    return (
        <CommandItem
            value={`${bookId} ${label}`}
            onSelect={() => onSelect(bookId)}
            className="text-[12.5px]"
        >
            <Check
                className={cn(
                    'mr-2 h-3.5 w-3.5',
                    selected ? 'opacity-100' : 'opacity-0',
                )}
                aria-hidden
            />
            {label}
        </CommandItem>
    );
}
