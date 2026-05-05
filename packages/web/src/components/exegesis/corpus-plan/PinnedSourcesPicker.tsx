import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { useTranslation } from '@/i18n';
import type { ProjectSource } from '@dosfilos/domain';
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

interface PinnedSourcesPickerProps {
    /** All sources currently in the paper's corpus (the picker's universe). */
    sources: ReadonlyArray<ProjectSource>;
    /** Currently pinned ids (controlled). */
    selected: ReadonlyArray<string>;
    onChange: (next: ReadonlyArray<string>) => void;
    disabled?: boolean;
}

/**
 * v1.7 corpus-usage planning — multi-select picker over the paper's
 * `ProjectSource[]`. Shows selected sources as removable badges above
 * + a popover (Command) for add/toggle. Mirrors the
 * `BibleBookMultiSelect` pattern from the smart-match feature.
 *
 * Read-only short labels in the badges (truncated displayLabel +
 * citationKey). The popover shows the full label for picking.
 */
export function PinnedSourcesPicker({
    sources,
    selected,
    onChange,
    disabled = false,
}: PinnedSourcesPickerProps) {
    const { t } = useTranslation('exegesis');
    const [open, setOpen] = useState(false);

    const selectedSet = useMemo(() => new Set(selected), [selected]);
    const sourcesById = useMemo(() => {
        const map = new Map<string, ProjectSource>();
        for (const s of sources) map.set(s.id, s);
        return map;
    }, [sources]);

    const toggle = (id: string) => {
        if (selectedSet.has(id)) {
            onChange(selected.filter(s => s !== id));
        } else {
            onChange([...selected, id]);
        }
    };

    const remove = (id: string) => {
        onChange(selected.filter(s => s !== id));
    };

    return (
        <div className="space-y-1.5">
            {selected.length > 0 && (
                <div className="flex flex-wrap gap-1" role="list">
                    {selected.map(id => {
                        const source = sourcesById.get(id);
                        const label = source?.displayLabel ?? id;
                        return (
                            <Badge
                                key={id}
                                variant="secondary"
                                className="gap-1 pr-1 text-[10.5px] max-w-[200px]"
                                role="listitem"
                            >
                                <span className="truncate">{label}</span>
                                <button
                                    type="button"
                                    onClick={() => remove(id)}
                                    disabled={disabled}
                                    className="rounded-sm hover:bg-foreground/10 focus:outline-none focus:ring-1 focus:ring-ring p-0.5 shrink-0"
                                    aria-label={t('paperSetup.subSteps.corpus-plan.picker.removeAria', { label })}
                                >
                                    <X className="h-2.5 w-2.5" aria-hidden />
                                </button>
                            </Badge>
                        );
                    })}
                </div>
            )}
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        role="combobox"
                        aria-expanded={open}
                        disabled={disabled || sources.length === 0}
                        className="h-7 text-[11px] font-normal gap-1"
                    >
                        {selected.length === 0
                            ? t('paperSetup.subSteps.corpus-plan.picker.add')
                            : t('paperSetup.subSteps.corpus-plan.picker.edit', { count: selected.length })}
                        <ChevronsUpDown className="h-3 w-3 opacity-50" aria-hidden />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[320px] p-0" align="start">
                    <Command>
                        <CommandInput
                            placeholder={t('paperSetup.subSteps.corpus-plan.picker.search')}
                            className="text-[12px]"
                        />
                        <CommandList className="max-h-64">
                            <CommandEmpty>{t('paperSetup.subSteps.corpus-plan.picker.noMatches')}</CommandEmpty>
                            <CommandGroup>
                                {sources.map(source => (
                                    <CommandItem
                                        key={source.id}
                                        value={`${source.id} ${source.displayLabel} ${source.citationKey ?? ''}`}
                                        onSelect={() => toggle(source.id)}
                                        className="text-[12px] gap-2"
                                    >
                                        <Check
                                            className={cn(
                                                'h-3.5 w-3.5',
                                                selectedSet.has(source.id) ? 'opacity-100' : 'opacity-0',
                                            )}
                                            aria-hidden
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="truncate">{source.displayLabel}</div>
                                            {source.citationKey && (
                                                <div className="text-[10px] text-muted-foreground truncate">
                                                    {source.citationKey} · {source.sourceType}
                                                </div>
                                            )}
                                        </div>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    );
}
