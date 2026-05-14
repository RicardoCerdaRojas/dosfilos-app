import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';
import type { ResponseMode } from '@dosfilos/domain';
import { useModeMeta } from './FacultyChatHeader';

interface ModeSelectorButtonProps {
    value: ResponseMode;
    onChange: (mode: ResponseMode) => void;
    /** Compact pill (icon + label, dropdown chevron). Default. */
    variant?: 'pill' | 'icon';
    className?: string;
}

/**
 * Standalone mode-selector that the orchestrator input + chat input
 * both embed near where the user types — colocating the "how should
 * the model answer" choice with the action it modifies. Replaces the
 * page-header dropdown that used to live miles away from any input.
 *
 * `pill` variant shows icon + label + chevron (default).
 * `icon` variant is icon-only — for tight slots in mobile / chat input.
 *
 * `useModeMeta` is reused from `FacultyChatHeader` so the
 * label/description copy and brand iconColor stay in one place.
 */
export function ModeSelectorButton({ value, onChange, variant = 'pill', className }: ModeSelectorButtonProps) {
    const { t } = useTranslation('faculty');
    const modeMeta = useModeMeta();
    const meta = modeMeta[value];
    const Icon = meta.icon;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                        'h-8 gap-1.5 rounded-full text-xs font-medium hover:bg-muted',
                        variant === 'pill' ? 'px-3' : 'w-8 px-0',
                        className,
                    )}
                    title={t('modeMenu.buttonTitle')}
                >
                    <Icon className={cn('w-3.5 h-3.5 shrink-0', meta.iconColor)} />
                    {variant === 'pill' && (
                        <>
                            <span>{meta.label}</span>
                            <ChevronDown className="w-3 h-3 opacity-50" />
                        </>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72">
                <DropdownMenuLabel className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {t('modeMenu.groupRecommended')}
                </DropdownMenuLabel>
                <ModeItem mode="auto" current={value} onChange={onChange} />
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {t('modeMenu.groupLength')}
                </DropdownMenuLabel>
                {(['concise', 'detailed'] as const).map(mode => (
                    <ModeItem key={mode} mode={mode} current={value} onChange={onChange} />
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {t('modeMenu.groupStyle')}
                </DropdownMenuLabel>
                {(['academic', 'pastoral', 'layperson'] as const).map(mode => (
                    <ModeItem key={mode} mode={mode} current={value} onChange={onChange} />
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function ModeItem({
    mode,
    current,
    onChange,
}: {
    mode: ResponseMode;
    current: ResponseMode;
    onChange: (mode: ResponseMode) => void;
}) {
    const modeMeta = useModeMeta();
    const meta = modeMeta[mode];
    const Icon = meta.icon;
    const isActive = current === mode;
    return (
        <DropdownMenuItem
            onClick={() => onChange(mode)}
            className={cn('cursor-pointer flex items-start gap-2.5 py-2', isActive && 'bg-accent')}
        >
            <Icon className={cn('w-4 h-4 mt-0.5 shrink-0', meta.iconColor)} />
            <div className="min-w-0">
                <div className={cn('text-sm', isActive && 'font-semibold text-accent-foreground')}>
                    {meta.label}
                </div>
                <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                    {meta.description}
                </div>
            </div>
        </DropdownMenuItem>
    );
}
