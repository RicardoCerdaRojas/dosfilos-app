import React from 'react';
import { ArrowLeft, AlignLeft, AlignJustify, ChevronDown, Clock, Download, PanelLeftOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';

interface FacultyChatHeaderProps {
    isHomeState: boolean;
    isNewSession: boolean;
    sessionTitle?: string;
    sessionAgentId?: string;
    agentNameForNew: string;
    lengthPreference: 'concise' | 'detailed';
    isLeftSidebarOpen: boolean;
    isRightSidebarOpen: boolean;
    onBack: () => void;
    onSetLengthPreference: (pref: 'concise' | 'detailed') => void;
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
                        <span className="text-lg">🎓</span>
                    </div>
                    <div>
                        <h1 className="text-lg font-bold leading-none tracking-tight">{displayTitle}</h1>
                        {!isHomeState && !isNewSession && sessionAgentId && (
                            <p className="text-[13px] text-muted-foreground mt-1 font-medium font-mono text-xs">
                                {t('header.professorId', { id: sessionAgentId })}
                            </p>
                        )}
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
                            title={t('header.responseLength')}
                        >
                            {lengthPreference === 'concise'
                                ? <AlignLeft className="w-4 h-4 text-indigo-500" />
                                : <AlignJustify className="w-4 h-4 text-indigo-500" />
                            }
                            <span className="text-xs font-semibold">
                                {lengthPreference === 'concise' ? t('header.responseBrief') : t('header.responseDetailed')}
                            </span>
                            <ChevronDown className="w-3 h-3 ml-1 opacity-50" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem
                            onClick={() => onSetLengthPreference('concise')}
                            className={cn("cursor-pointer", lengthPreference === 'concise' && 'bg-indigo-50 font-medium text-indigo-900 dark:bg-indigo-900/30 dark:text-indigo-200')}
                        >
                            <AlignLeft className="w-4 h-4 mr-2 text-indigo-500" />
                            {t('header.briefDescription')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => onSetLengthPreference('detailed')}
                            className={cn("cursor-pointer", lengthPreference === 'detailed' && 'bg-indigo-50 font-medium text-indigo-900 dark:bg-indigo-900/30 dark:text-indigo-200')}
                        >
                            <AlignJustify className="w-4 h-4 mr-2 text-indigo-500" />
                            {t('header.detailedDescription')}
                        </DropdownMenuItem>
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
