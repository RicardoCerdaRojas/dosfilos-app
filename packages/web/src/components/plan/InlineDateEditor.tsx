import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';

interface InlineDateEditorProps {
    value: Date | undefined;
    onChange: (next: Date | null) => void;
    disabled?: boolean;
    /** Compact display label class for the trigger button. */
    className?: string;
}

/**
 * Date cell that turns into a date-input popover when clicked. Used on
 * each row of the series-detail sermons table so the pastor can shift
 * a sermon's date without leaving the page (no full-modal edit needed
 * for a one-field change). `null` from onChange means "clear the date".
 */
export function InlineDateEditor({ value, onChange, disabled, className }: InlineDateEditorProps) {
    const { t, i18n } = useTranslation('series');
    const locale = i18n.language?.split('-')[0] === 'en' ? 'en-US' : 'es-ES';
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState(() => toInputValue(value));

    useEffect(() => {
        if (!open) setDraft(toInputValue(value));
    }, [open, value]);

    const handleCommit = () => {
        if (!draft) {
            onChange(null);
        } else {
            const parsed = fromInputValue(draft);
            if (parsed) onChange(parsed);
        }
        setOpen(false);
    };

    const handleClear = () => {
        setDraft('');
        onChange(null);
        setOpen(false);
    };

    const displayLabel = value
        ? value.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
        : t('detail.table.dateMissing') as string;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    disabled={disabled}
                    className={cn(
                        'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium transition-colors',
                        value
                            ? 'text-foreground hover:bg-accent'
                            : 'text-muted-foreground hover:bg-accent italic',
                        disabled && 'opacity-50 cursor-not-allowed',
                        className,
                    )}
                >
                    <CalendarIcon className="h-3 w-3" />
                    {displayLabel}
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3 space-y-2.5">
                <p className="text-[12px] font-medium text-foreground">
                    {t('detail.table.editDate')}
                </p>
                <input
                    type="date"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <div className="flex justify-between items-center gap-1.5">
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleClear}
                        className="h-7 px-2 text-[11px] text-muted-foreground"
                    >
                        <X className="h-3 w-3 mr-1" />
                        {t('detail.table.clearDate')}
                    </Button>
                    <div className="flex gap-1.5">
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setOpen(false)}
                            className="h-7 text-[11px]"
                        >
                            {t('detail.table.cancel')}
                        </Button>
                        <Button size="sm" onClick={handleCommit} className="h-7 text-[11px]">
                            {t('detail.table.apply')}
                        </Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}

function toInputValue(d: Date | undefined): string {
    if (!d) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function fromInputValue(s: string): Date | null {
    const [y, m, d] = s.split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
}
