import React from 'react';
import { ArrowLeft, AlignLeft, AlignJustify, ChevronDown, Clock, Download, PanelLeftOpen, GraduationCap, HeartHandshake, Lightbulb, Sparkles } from 'lucide-react';
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
        <header className="flex items-center justify-between px-6 py-4 bg-white dark:bg-zinc-900 border-b shrink-0 shadow-sm z-10">
            <div className="flex items-center gap-4">
                {!isHomeState && (
                    <Button variant="ghost" size="icon" onClick={onBack} className="hover:bg-slate-100 dark:hover:bg-zinc-800">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                )}
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
                        <GraduationCap className="h-4 w-4 text-indigo-600 dark:text-indigo-300" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold leading-none tracking-tight">{displayTitle}</h1>
                        {/*
                         * Subtitle: only meaningful for the new-session affordance ("type your
                         * first question"). The previous "Professor ID: N" line was misleading
                         * because the orchestrated path can route the same session to multiple
                         * specialists across messages — there's no single "owning" tutor.
                         */}
                        {isNewSession && (
                            <p className="text-[13px] text-muted-foreground mt-0.5 text-xs">{t('header.newSession')}</p>
                        )}
                    </div>
                </div>
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
                                        isActive && 'bg-indigo-50 dark:bg-indigo-900/30'
                                    )}
                                >
                                    <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", meta.iconColor)} />
                                    <div className="min-w-0">
                                        <div className={cn("text-sm", isActive && "font-semibold text-indigo-900 dark:text-indigo-200")}>
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
                                        isActive && 'bg-indigo-50 dark:bg-indigo-900/30'
                                    )}
                                >
                                    <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", meta.iconColor)} />
                                    <div className="min-w-0">
                                        <div className={cn("text-sm", isActive && "font-semibold text-indigo-900 dark:text-indigo-200")}>
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
                                        isActive && 'bg-indigo-50 dark:bg-indigo-900/30'
                                    )}
                                >
                                    <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", meta.iconColor)} />
                                    <div className="min-w-0">
                                        <div className={cn("text-sm", isActive && "font-semibold text-indigo-900 dark:text-indigo-200")}>
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

                <div className="h-4 w-px bg-slate-200 dark:bg-zinc-700 mx-1 hidden sm:block" />

                <Button
                    variant={isLeftSidebarOpen ? "secondary" : "ghost"}
                    size="sm"
                    onClick={onToggleLeftSidebar}
                    className={cn("hidden md:flex items-center gap-2 transition-colors", isLeftSidebarOpen && "bg-slate-100 dark:bg-zinc-800")}
                    title={t('header.projectsAndSessions')}
                >
                    <Clock className="w-4 h-4" />
                    <span className="text-xs font-semibold">{t('header.sessions')}</span>
                </Button>
                <Button
                    variant={isRightSidebarOpen ? "secondary" : "ghost"}
                    size="sm"
                    onClick={onToggleRightSidebar}
                    className={cn("hidden lg:flex items-center gap-2 transition-colors", isRightSidebarOpen && "bg-slate-100 dark:bg-zinc-800")}
                    title={t('header.contentExtraction')}
                >
                    <Download className="w-4 h-4" />
                    <span className="text-xs font-semibold">{t('header.extract')}</span>
                </Button>
            </div>
        </header>
    );
}
