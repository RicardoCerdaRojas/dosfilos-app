import React from 'react';
import { ArrowLeft, AlignLeft, AlignJustify, ChevronDown, GraduationCap, HeartHandshake, Lightbulb, PanelLeft, PanelLeftClose, PanelRight, PanelRightClose, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';
import type { ResponseMode } from '@dosfilos/domain';

interface ModeMetaEntry {
    label: string;
    description: string;
    icon: React.ComponentType<any>;
    iconColor: string;
}

// Icon + color metadata is locale-agnostic, so it stays here as a constant.
// Labels and descriptions live in `faculty.json#modes` and are merged in by
// `useModeMeta()` below — this keeps the dropdown menu and the inferred-mode
// badge in sync without each component re-fetching the same translations.
const MODE_VISUAL: Record<ResponseMode, { icon: React.ComponentType<any>; iconColor: string }> = {
    auto:      { icon: Sparkles,      iconColor: 'text-indigo-500' },
    concise:   { icon: AlignLeft,     iconColor: 'text-slate-500' },
    detailed:  { icon: AlignJustify,  iconColor: 'text-indigo-500' },
    academic:  { icon: GraduationCap, iconColor: 'text-violet-600' },
    pastoral:  { icon: HeartHandshake,iconColor: 'text-emerald-600' },
    layperson: { icon: Lightbulb,     iconColor: 'text-amber-500' },
};

export function useModeMeta(): Record<ResponseMode, ModeMetaEntry> {
    const { t } = useTranslation('faculty');
    return {
        auto:      { ...MODE_VISUAL.auto,      label: t('modes.auto.label'),      description: t('modes.auto.description') },
        concise:   { ...MODE_VISUAL.concise,   label: t('modes.concise.label'),   description: t('modes.concise.description') },
        detailed:  { ...MODE_VISUAL.detailed,  label: t('modes.detailed.label'),  description: t('modes.detailed.description') },
        academic:  { ...MODE_VISUAL.academic,  label: t('modes.academic.label'),  description: t('modes.academic.description') },
        pastoral:  { ...MODE_VISUAL.pastoral,  label: t('modes.pastoral.label'),  description: t('modes.pastoral.description') },
        layperson: { ...MODE_VISUAL.layperson, label: t('modes.layperson.label'), description: t('modes.layperson.description') },
    };
}

interface FacultyChatHeaderProps {
    isHomeState: boolean;
    isNewSession: boolean;
    sessionTitle?: string;
    sessionAgentId?: string;
    agentNameForNew: string;
    lengthPreference: ResponseMode;
    isLeftSidebarOpen: boolean;
    isRightSidebarOpen: boolean;
    onBack: () => void;
    onSetLengthPreference: (pref: ResponseMode) => void;
    onToggleLeftSidebar: () => void;
    onToggleRightSidebar: () => void;
}

export function FacultyChatHeader({
    isHomeState,
    isNewSession,
    sessionTitle,
    sessionAgentId,
    agentNameForNew,
    lengthPreference,
    isLeftSidebarOpen,
    isRightSidebarOpen,
    onBack,
    onSetLengthPreference,
    onToggleLeftSidebar,
    onToggleRightSidebar,
}: FacultyChatHeaderProps) {
    const { t } = useTranslation('faculty');
    const modeMeta = useModeMeta();

    const displayTitle = isHomeState
        ? t('header.title')
        : isNewSession
            ? agentNameForNew
            : (sessionTitle || t('header.sessionActive'));

    return (
        <header className="flex items-center justify-between px-6 py-3 bg-background border-b shrink-0 shadow-sm z-10">
            {/*
             * Left cluster — context-aware:
             *   - Home: nothing. The hero already owns the title;
             *     duplicating it here was pure visual redundancy.
             *   - Session: back arrow + session title. The avatar
             *     was decorative; dropped to keep the row compact.
             */}
            <div className="flex items-center gap-3 min-w-0">
                {!isHomeState && (
                    <>
                        <Button variant="ghost" size="icon" onClick={onBack} className="hover:bg-accent shrink-0">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div className="min-w-0">
                            <h1 className="text-base font-semibold leading-none tracking-tight truncate">{displayTitle}</h1>
                            {isNewSession && (
                                <p className="text-[11px] text-muted-foreground mt-1">{t('header.newSession')}</p>
                            )}
                        </div>
                    </>
                )}
            </div>
            <div className="flex items-center gap-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            className="hidden sm:flex items-center gap-2"
                            title={t('modeMenu.buttonTitle')}
                        >
                            {(() => {
                                const meta = modeMeta[lengthPreference];
                                const Icon = meta.icon;
                                return <Icon className={cn("w-4 h-4", meta.iconColor)} />;
                            })()}
                            <span className="text-xs font-semibold">
                                {modeMeta[lengthPreference].label}
                            </span>
                            <ChevronDown className="w-3 h-3 ml-1 opacity-50" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-72">
                        <DropdownMenuLabel className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {t('modeMenu.groupRecommended')}
                        </DropdownMenuLabel>
                        {(() => {
                            const meta = modeMeta.auto;
                            const Icon = meta.icon;
                            const isActive = lengthPreference === 'auto';
                            return (
                                <DropdownMenuItem
                                    onClick={() => onSetLengthPreference('auto')}
                                    className={cn(
                                        "cursor-pointer flex items-start gap-2.5 py-2",
                                        isActive && 'bg-accent'
                                    )}
                                >
                                    <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", meta.iconColor)} />
                                    <div className="min-w-0">
                                        <div className={cn("text-sm", isActive && "font-semibold text-accent-foreground")}>
                                            {meta.label}
                                        </div>
                                        <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                                            {meta.description}
                                        </div>
                                    </div>
                                </DropdownMenuItem>
                            );
                        })()}
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {t('modeMenu.groupLength')}
                        </DropdownMenuLabel>
                        {(['concise', 'detailed'] as const).map(mode => {
                            const meta = modeMeta[mode];
                            const Icon = meta.icon;
                            const isActive = lengthPreference === mode;
                            return (
                                <DropdownMenuItem
                                    key={mode}
                                    onClick={() => onSetLengthPreference(mode)}
                                    className={cn(
                                        "cursor-pointer flex items-start gap-2.5 py-2",
                                        isActive && 'bg-accent'
                                    )}
                                >
                                    <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", meta.iconColor)} />
                                    <div className="min-w-0">
                                        <div className={cn("text-sm", isActive && "font-semibold text-accent-foreground")}>
                                            {meta.label}
                                        </div>
                                        <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                                            {meta.description}
                                        </div>
                                    </div>
                                </DropdownMenuItem>
                            );
                        })}
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {t('modeMenu.groupStyle')}
                        </DropdownMenuLabel>
                        {(['academic', 'pastoral', 'layperson'] as const).map(mode => {
                            const meta = modeMeta[mode];
                            const Icon = meta.icon;
                            const isActive = lengthPreference === mode;
                            return (
                                <DropdownMenuItem
                                    key={mode}
                                    onClick={() => onSetLengthPreference(mode)}
                                    className={cn(
                                        "cursor-pointer flex items-start gap-2.5 py-2",
                                        isActive && 'bg-accent'
                                    )}
                                >
                                    <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", meta.iconColor)} />
                                    <div className="min-w-0">
                                        <div className={cn("text-sm", isActive && "font-semibold text-accent-foreground")}>
                                            {meta.label}
                                        </div>
                                        <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                                            {meta.description}
                                        </div>
                                    </div>
                                </DropdownMenuItem>
                            );
                        })}
                    </DropdownMenuContent>
                </DropdownMenu>

                <div className="h-4 w-px bg-border mx-1 hidden sm:block" />

                {/*
                 * Symmetric icon toggles for the two side rails. Same
                 * visual language (Panel{Left,Right}{,Close} from
                 * lucide), same behaviour (tap to expand / collapse,
                 * fully hidden when collapsed). Replaces the
                 * previous labeled "Sesiones" / "Crear recurso"
                 * buttons which mixed text + icon and looked
                 * different from each other in subtle ways.
                 */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onToggleLeftSidebar}
                    className={cn("hidden md:inline-flex h-9 w-9 transition-colors", isLeftSidebarOpen && "bg-secondary text-foreground")}
                    title={t('header.projectsAndSessions')}
                    aria-pressed={isLeftSidebarOpen}
                >
                    {isLeftSidebarOpen
                        ? <PanelLeftClose className="w-4 h-4" />
                        : <PanelLeft className="w-4 h-4" />
                    }
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onToggleRightSidebar}
                    className={cn("hidden lg:inline-flex h-9 w-9 transition-colors", isRightSidebarOpen && "bg-secondary text-foreground")}
                    title={t('header.contentExtraction')}
                    aria-pressed={isRightSidebarOpen}
                >
                    {isRightSidebarOpen
                        ? <PanelRightClose className="w-4 h-4" />
                        : <PanelRight className="w-4 h-4" />
                    }
                </Button>
            </div>
        </header>
    );
}
