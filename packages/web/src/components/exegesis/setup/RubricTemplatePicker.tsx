import { useState } from 'react';
import { Check, ChevronsUpDown, FileText, Layers, Sparkles, Star, Wand2 } from 'lucide-react';
import { STRATEGY_ONLY_RUBRIC_PRESET_ID, type UserRubric } from '@dosfilos/domain';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTranslation } from '@/i18n';
import { cn } from '@/lib/utils';

/**
 * Combobox-style rubric picker shared between the create page and
 * the setup page.
 *
 * Value semantics:
 *   - `undefined`                          → automatic: use the user's
 *                                            default if any, otherwise
 *                                            the system TMS default.
 *                                            Hidden when `mode === 'apply'`
 *                                            because "auto" is only
 *                                            meaningful at create time.
 *   - `null`                               → "no template": apply the
 *                                            system TMS default
 *                                            explicitly.
 *   - `STRATEGY_ONLY_RUBRIC_PRESET_ID`     → apply the strategy-only
 *                                            system preset.
 *   - any other string                     → apply the user template
 *                                            with that id.
 *
 * `mode` selects which audience the picker is rendered for:
 *   - `'create'` (default) — used at paper creation; offers the
 *                            "automatic" auto-fallback option since
 *                            the use case can resolve a default
 *                            template before the paper exists.
 *   - `'apply'`            — used to swap the rubric on an existing
 *                            paper. Hides the "automatic" option
 *                            because there is no template-resolution
 *                            step at this point — the only meaningful
 *                            choices are: strategy-only, system
 *                            default, or a user template.
 */
export interface RubricTemplatePickerProps {
    value: string | null | undefined;
    onChange: (next: string | null | undefined) => void;
    rubrics: ReadonlyArray<UserRubric>;
    defaultRubric: UserRubric | null;
    mode?: 'create' | 'apply';
    disabled?: boolean;
}

export function RubricTemplatePicker({
    value,
    onChange,
    rubrics,
    defaultRubric,
    mode = 'create',
    disabled = false,
}: RubricTemplatePickerProps) {
    const { t } = useTranslation('exegesis');
    const [open, setOpen] = useState(false);

    const selectedLabel = (() => {
        if (value === STRATEGY_ONLY_RUBRIC_PRESET_ID) {
            return { title: t('create.rubric.strategyOnly'), kind: 'strategy' as const };
        }
        if (value === null) {
            return { title: t('create.rubric.noTemplate'), kind: 'system' as const };
        }
        if (value === undefined) {
            // In apply mode, `undefined` means "couldn't derive a
            // clean current selection" (e.g. paper has a user-edited
            // rubric). Surface a neutral "pick what to apply" label
            // instead of the create-time "automatic" wording, which
            // would falsely claim the system is auto-resolving.
            if (mode === 'apply') {
                return { title: t('create.rubric.applyPlaceholder'), kind: 'placeholder' as const };
            }
            return defaultRubric
                ? { title: t('create.rubric.useDefault', { name: defaultRubric.displayName }), kind: 'auto' as const }
                : { title: t('create.rubric.useDefaultNone'), kind: 'system' as const };
        }
        const found = rubrics.find(r => r.id === value);
        return { title: found?.displayName ?? value, kind: 'template' as const };
    })();

    const select = (next: string | null | undefined) => {
        onChange(next);
        setOpen(false);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className="w-full justify-between h-auto py-2 px-3 font-normal text-left"
                >
                    <span className="flex items-center gap-2 min-w-0">
                        <RubricKindIcon kind={selectedLabel.kind} />
                        <span className="text-sm text-foreground truncate">{selectedLabel.title}</span>
                    </span>
                    <ChevronsUpDown className="h-3.5 w-3.5 opacity-50 shrink-0" aria-hidden />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-[var(--radix-popover-trigger-width)] p-0 shadow-xl border border-border z-50 rounded-md overflow-hidden"
                align="start"
                sideOffset={4}
            >
                <Command>
                    <CommandInput
                        placeholder={t('create.rubric.search')}
                        className="text-[12px] focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0"
                    />
                    <CommandList className="max-h-[400px]">
                        <CommandEmpty>{t('create.rubric.noMatches')}</CommandEmpty>

                        <CommandGroup heading={t('create.rubric.groupRecommended')}>
                            <RubricOption
                                value={STRATEGY_ONLY_RUBRIC_PRESET_ID}
                                selected={value === STRATEGY_ONLY_RUBRIC_PRESET_ID}
                                title={t('create.rubric.strategyOnly')}
                                description={t('create.rubric.strategyOnlyDescription')}
                                icon={<Wand2 className="h-3.5 w-3.5 text-success" aria-hidden />}
                                onSelect={() => select(STRATEGY_ONLY_RUBRIC_PRESET_ID)}
                            />
                        </CommandGroup>

                        <CommandSeparator />

                        <CommandGroup heading={t('create.rubric.groupAuto')}>
                            {mode === 'create' && (
                                <RubricOption
                                    value="__auto"
                                    selected={value === undefined}
                                    title={defaultRubric
                                        ? t('create.rubric.useDefault', { name: defaultRubric.displayName })
                                        : t('create.rubric.autoSystem')}
                                    description={defaultRubric
                                        ? t('create.rubric.autoFromUserDefault')
                                        : t('create.rubric.autoSystemDescription')}
                                    icon={<Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />}
                                    onSelect={() => select(undefined)}
                                />
                            )}
                            <RubricOption
                                value="__none"
                                selected={value === null}
                                title={t('create.rubric.systemTitle')}
                                description={t('create.rubric.systemDescription')}
                                icon={<Layers className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />}
                                onSelect={() => select(null)}
                            />
                        </CommandGroup>

                        {rubrics.length > 0 && (
                            <>
                                <CommandSeparator />
                                <CommandGroup heading={t('create.rubric.savedTemplates')}>
                                    {rubrics.map(r => (
                                        <RubricOption
                                            key={r.id}
                                            value={r.id}
                                            selected={value === r.id}
                                            title={r.displayName}
                                            description={r.isDefault
                                                ? t('create.rubric.templateIsDefault')
                                                : ''}
                                            icon={r.isDefault
                                                ? <Star className="h-3.5 w-3.5 text-warning-subtle-foreground fill-warning-subtle-foreground" aria-hidden />
                                                : <FileText className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />}
                                            onSelect={() => select(r.id)}
                                        />
                                    ))}
                                </CommandGroup>
                            </>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

function RubricOption({
    value,
    selected,
    title,
    description,
    icon,
    onSelect,
}: {
    value: string;
    selected: boolean;
    title: string;
    description: string;
    icon: React.ReactNode;
    onSelect: () => void;
}) {
    return (
        <CommandItem
            value={value + ' ' + title}
            onSelect={onSelect}
            className="text-[12px] gap-2 items-start py-2 cursor-pointer"
        >
            <Check
                className={cn(
                    'h-3.5 w-3.5 mt-0.5 shrink-0',
                    selected ? 'opacity-100' : 'opacity-0',
                )}
                aria-hidden
            />
            <span className="mt-0.5 shrink-0">{icon}</span>
            <div className="flex-1 min-w-0">
                <div className="text-foreground leading-snug font-medium break-words">
                    {title}
                </div>
                {description && (
                    <div className="text-[10.5px] text-muted-foreground leading-snug mt-0.5">
                        {description}
                    </div>
                )}
            </div>
        </CommandItem>
    );
}

function RubricKindIcon({ kind }: { kind: 'strategy' | 'auto' | 'system' | 'template' | 'placeholder' }) {
    if (kind === 'strategy') return <Wand2 className="h-3.5 w-3.5 text-success shrink-0" aria-hidden />;
    if (kind === 'auto') return <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden />;
    if (kind === 'system') return <Layers className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden />;
    if (kind === 'placeholder') return <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden />;
    return <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden />;
}
