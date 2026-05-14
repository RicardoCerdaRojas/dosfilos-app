import React, { useState, useMemo } from 'react';
import { Search, X, SquarePen, FolderPlus, ChevronRight, Edit3, Trash2, FolderOpen, Loader2, LayoutGrid } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useTranslation } from '@/i18n';
import { type AIChatSession, type AIProject } from '@dosfilos/domain';

// ── Constants ────────────────────────────────────────────────────────────────

const AGENT_DOT_COLORS = ['bg-sky-500', 'bg-amber-500', 'bg-emerald-500', 'bg-rose-500', 'bg-violet-500', 'bg-teal-500', 'bg-orange-500', 'bg-indigo-400'] as const;

const PROJECT_COLOR_BG: Record<string, string> = {
    amber: 'bg-amber-400', emerald: 'bg-emerald-400', sky: 'bg-sky-400',
    rose: 'bg-rose-400', violet: 'bg-violet-400', slate: 'bg-slate-400',
    orange: 'bg-orange-400', teal: 'bg-teal-400',
};

function agentDotColor(agentId: string): string {
    let h = 0;
    for (const c of agentId) { h = (h << 5) - h + c.charCodeAt(0); h |= 0; }
    return AGENT_DOT_COLORS[Math.abs(h) % AGENT_DOT_COLORS.length] ?? 'bg-slate-500';
}

// ── Time-group helper ────────────────────────────────────────────────────────

const TIME_GROUP_KEYS = ['today', 'yesterday', 'thisWeek', 'thisMonth', 'older'] as const;

function getTimeGroupKey(date: Date): typeof TIME_GROUP_KEYS[number] {
    const d = Math.floor((Date.now() - date.getTime()) / 86_400_000);
    if (d === 0) return 'today';
    if (d === 1) return 'yesterday';
    if (d <= 7) return 'thisWeek';
    if (d <= 30) return 'thisMonth';
    return 'older';
}

// ── SessionItem sub-component ────────────────────────────────────────────────

interface SessionItemProps {
    session: AIChatSession;
    isActive: boolean;
    projects: AIProject[];
    openMenuId: string | null;
    setOpenMenuId: (id: string | null) => void;
    onNavigate: () => void;
    onDelete: () => void;
    onRename: () => void;
    onAssign: (pid: string | null) => void;
    isEditing?: boolean;
    onSaveRename?: (newTitle: string) => void;
    onCancelRename?: () => void;
}

function SessionItem({
    session: s, isActive, projects, openMenuId, setOpenMenuId,
    onNavigate, onDelete, onRename, onAssign,
    isEditing, onSaveRename, onCancelRename,
}: SessionItemProps) {
    const { t } = useTranslation('faculty');
    const [localTitle, setLocalTitle] = useState(s.title || '');

    React.useEffect(() => {
        if (isEditing) setLocalTitle(s.title || '');
    }, [isEditing, s.title]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            onSaveRename?.(localTitle);
        } else if (e.key === 'Escape') {
            onCancelRename?.();
        }
    };

    const isMenuOpen = openMenuId === s.id;
    return (
        <div className="relative group min-w-0">
            <div
                onClick={onNavigate}
                className={cn(
                    'flex items-start gap-2 px-2 py-2 text-xs rounded-md mb-0.5 cursor-pointer transition-colors',
                    isActive
                        ? 'bg-card border border-warning/30 shadow-sm'
                        : 'border border-transparent hover:bg-card hover:border-border'
                )}
            >
                <span className={cn('mt-0.5 w-2 h-2 rounded-full shrink-0', agentDotColor(s.agentId))} />
                <div className="flex-1 min-w-0">
                    {isEditing ? (
                        <input
                            autoFocus
                            className="w-full bg-card border border-warning rounded px-1 py-0.5 text-xs focus:outline-none"
                            value={localTitle}
                            onChange={e => setLocalTitle(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onBlur={() => onCancelRename?.()}
                            onClick={e => e.stopPropagation()}
                        />
                    ) : (
                        <div className="font-medium text-foreground truncate leading-snug">
                            {s.title || t('sessionItem.defaultTitle')}
                        </div>
                    )}
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(s.updatedAt, { locale: es, addSuffix: true })}</span>
                        {s.messages.length > 0 && (
                            <span className="text-[10px] bg-muted text-muted-foreground px-1 rounded tabular-nums">{s.messages.length}</span>
                        )}
                    </div>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5 shrink-0 mt-0.5" onClick={e => e.stopPropagation()}>
                    {projects.length > 0 && (
                        <button
                            onClick={() => setOpenMenuId(isMenuOpen ? null : s.id)}
                            className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-warning"
                            title={t('sessionItem.moveToProject')}
                        >
                            <FolderOpen className="w-3 h-3" />
                        </button>
                    )}
                    <button
                        onClick={onRename}
                        className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                        title={t('sessionItem.rename')}
                    >
                        <Edit3 className="w-3 h-3" />
                    </button>
                    <button
                        onClick={onDelete}
                        className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                        title={t('sessionItem.delete')}
                    >
                        <Trash2 className="w-3 h-3" />
                    </button>
                </div>
            </div>
            {isMenuOpen && (
                <div className="absolute right-1 top-8 z-20 w-44 rounded-lg shadow-lg bg-card border border-border py-1 text-xs">
                    <p className="px-3 py-1 text-[10px] text-muted-foreground uppercase font-semibold tracking-wide">{t('sessionItem.moveTo')}</p>
                    {projects.map(p => (
                        <button
                            key={p.id}
                            onClick={() => { onAssign(p.id); setOpenMenuId(null); }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-muted/50 text-foreground text-left"
                        >
                            <span className={cn('w-2 h-2 rounded-full shrink-0', PROJECT_COLOR_BG[p.color] || 'bg-slate-400')} />
                            <span className="truncate">{p.title}</span>
                        </button>
                    ))}
                    {s.projectId && (
                        <button
                            onClick={() => { onAssign(null); setOpenMenuId(null); }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-muted/50 text-muted-foreground text-left"
                        >
                            <X className="w-3 h-3 shrink-0" /><span>{t('sessionItem.removeFromProject')}</span>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Main sidebar component ───────────────────────────────────────────────────

interface FacultySessionSidebarProps {
    isOpen: boolean;
    /** Open-state width in pixels. Driven by chat.tsx so the
     *  RailDivider can resize the rail by mutating that state. */
    width?: number;
    sessions: AIChatSession[];
    projects: AIProject[];
    activeSessionId?: string;
    isLoading: boolean;
    renameConfirmId: string | null;
    /** Optional — kept for callers that still wire it. The rail
     *  itself no longer renders an internal close button; the
     *  RailDivider on the rail boundary owns the open/close action. */
    onToggle?: () => void;
    onNewConversation: () => void;
    onNewProject: () => void;
    onNavigateSession: (sessionId: string) => void;
    onDeleteSession: (sessionId: string) => void;
    onRenameSession: (sessionId: string) => void;
    onSaveRename: (sessionId: string, newTitle: string) => void;
    onCancelRename: () => void;
    onAssignToProject: (sessionId: string, projectId: string | null) => void;
    onEditProject: (project: AIProject) => void;
    onDeleteProject: (projectId: string) => void;
}

export function FacultySessionSidebar({
    isOpen,
    width = 256,
    sessions,
    projects,
    activeSessionId,
    isLoading,
    renameConfirmId,
    onNewConversation,
    onNewProject,
    onNavigateSession,
    onDeleteSession,
    onRenameSession,
    onSaveRename,
    onCancelRename,
    onAssignToProject,
    onEditProject,
    onDeleteProject,
}: FacultySessionSidebarProps) {
    const { t } = useTranslation('faculty');
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
    const [sessionMenuId, setSessionMenuId] = useState<string | null>(null);

    const ungroupedSessions = useMemo(() => sessions.filter(s => !s.projectId), [sessions]);

    const filteredSessions = useMemo(() => {
        if (!searchQuery) return [];
        const q = searchQuery.toLowerCase();
        return sessions
            .filter(s =>
                (s.title || t('sessionItem.defaultTitle')).toLowerCase().includes(q) ||
                s.messages.some(m => m.content.toLowerCase().includes(q))
            )
            .map(s => {
                if ((s.title || t('sessionItem.defaultTitle')).toLowerCase().includes(q))
                    return { session: s, snippet: null as string | null };
                const msg = s.messages.find(m => m.content.toLowerCase().includes(q));
                if (!msg) return { session: s, snippet: null as string | null };
                const idx = msg.content.toLowerCase().indexOf(q);
                const start = Math.max(0, idx - 30);
                const end = Math.min(msg.content.length, idx + q.length + 60);
                const snippet = `${start > 0 ? '…' : ''}${msg.content.slice(start, end)}${end < msg.content.length ? '…' : ''}`;
                return { session: s, snippet };
            });
    }, [sessions, searchQuery, t]);

    const timeGroupedSessions = useMemo(() => {
        const groups: Record<string, AIChatSession[]> = {};
        for (const s of ungroupedSessions) {
            const key = getTimeGroupKey(s.updatedAt);
            (groups[key] ??= []).push(s);
        }
        return TIME_GROUP_KEYS
            .filter(k => groups[k])
            .map(k => [k, groups[k]] as [typeof TIME_GROUP_KEYS[number], AIChatSession[]]);
    }, [ungroupedSessions]);

    const renderSessionItem = (s: AIChatSession) => (
        <SessionItem
            key={s.id}
            session={s}
            isActive={s.id === activeSessionId}
            projects={projects}
            openMenuId={sessionMenuId}
            setOpenMenuId={setSessionMenuId}
            onNavigate={() => onNavigateSession(s.id)}
            onDelete={() => onDeleteSession(s.id)}
            onRename={() => onRenameSession(s.id)}
            onAssign={pid => onAssignToProject(s.id, pid)}
            isEditing={renameConfirmId === s.id}
            onSaveRename={newTitle => onSaveRename(s.id, newTitle)}
            onCancelRename={onCancelRename}
        />
    );

    return (
        <>
            {/*
             * Symmetric collapse: rail goes to 0-width when closed
             * (no sliver). Open/close is driven exclusively by the
             * page-header `PanelLeft` toggle so the user has one
             * consistent affordance for both rails.
             */}
            <aside
                className={cn(
                    'border-border bg-muted/30 hidden md:flex flex-col shrink-0 ease-in-out',
                    // Animate only on open/close (length transition);
                    // when dragging the resize handle we want the
                    // width to follow the cursor without easing.
                    'transition-[width,opacity] duration-300',
                    isOpen ? 'border-r opacity-100' : 'w-0 border-r-0 opacity-0 overflow-hidden',
                )}
                style={isOpen ? { width: `${width}px` } : undefined}
            >
                <div style={{ width: `${width}px` }} className="flex flex-col h-full overflow-x-hidden">
                    {/* Action bar */}
                    <div className="px-2 py-2 flex items-center justify-between border-b border-border/50 shrink-0">
                        <span className="text-[10px] font-bold text-muted-foreground dark:text-muted-foreground uppercase tracking-widest pl-1">{t('sidebar.mySessions')}</span>
                        <div className="flex items-center gap-0.5">
                            <button
                                onClick={onNewConversation}
                                className="p-1.5 rounded-md hover:bg-warning/10 text-muted-foreground hover:text-warning transition-colors"
                                title={t('sidebar.newConversation')}
                            >
                                <SquarePen className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={onNewProject}
                                className="p-1.5 rounded-md hover:bg-warning/10 text-muted-foreground hover:text-warning transition-colors"
                                title={t('sidebar.newProject')}
                            >
                                <FolderPlus className="w-3.5 h-3.5" />
                            </button>
                            {/*
                             * Open / close moved to the RailDivider on
                             * the rail boundary — single affordance,
                             * also supports drag-to-resize.
                             */}
                        </div>
                    </div>
                    {/* Search bar */}
                    <div className="p-2.5 border-b border-border/50 shrink-0">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                            <input
                                type="text"
                                placeholder={t('sidebar.searchPlaceholder')}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full py-1.5 pl-8 pr-7 text-xs rounded-md border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-warning/60 placeholder:text-muted-foreground"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1.5 text-muted-foreground hover:text-foreground">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>
                    {/* Scrollable list */}
                    <div className="flex-1 overflow-y-auto overflow-x-hidden py-1">
                        {isLoading ? (
                            <div className="p-4 flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
                        ) : (
                            <>
                                {/* Projects */}
                                {!searchQuery && (
                                    <div>
                                        {projects.map(project => {
                                            const isExpanded = expandedProjects.has(project.id);
                                            const pSessions = sessions.filter(s => s.projectId === project.id);
                                            const colorBg = PROJECT_COLOR_BG[project.color] || 'bg-slate-400';
                                            return (
                                                <div key={project.id}>
                                                    <div className="group flex items-center px-2 py-1.5 hover:bg-muted">
                                                        <button
                                                            onClick={() => setExpandedProjects(prev => { const n = new Set(prev); isExpanded ? n.delete(project.id) : n.add(project.id); return n; })}
                                                            className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
                                                        >
                                                            <ChevronRight className={cn('w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 shrink-0', isExpanded && 'rotate-90')} />
                                                            <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', colorBg)} />
                                                            <span className="text-xs font-medium text-foreground truncate">{project.title}</span>
                                                            {pSessions.length > 0 && <span className="ml-auto text-[10px] text-muted-foreground tabular-nums shrink-0 pl-1">{pSessions.length}</span>}
                                                        </button>
                                                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1">
                                                            <Link
                                                                to={`/dashboard/faculty/project/${project.id}`}
                                                                onClick={e => e.stopPropagation()}
                                                                className="p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-accent-foreground"
                                                                title="Abrir panel del proyecto"
                                                            >
                                                                <LayoutGrid className="w-3 h-3" />
                                                            </Link>
                                                            <button onClick={e => { e.stopPropagation(); onEditProject(project); }}
                                                                className="p-0.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground" title={t('sessionItem.editProject')}>
                                                                <Edit3 className="w-3 h-3" />
                                                            </button>
                                                            <button onClick={e => { e.stopPropagation(); onDeleteProject(project.id); }}
                                                                className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive" title={t('sessionItem.deleteProject')}>
                                                                <Trash2 className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    {isExpanded && (
                                                        <div className="pl-5 ml-3 border-l border-border/50 mb-1">
                                                            {pSessions.length === 0
                                                                ? <p className="text-[11px] text-muted-foreground px-2 py-1.5 italic">{t('sessionItem.noSessionsYet')}</p>
                                                                : pSessions.map(renderSessionItem)
                                                            }
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                {/* Ungrouped sessions */}
                                {!searchQuery && ungroupedSessions.length > 0 && (
                                    <div className="mt-1">
                                        <p className="px-3 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t('sidebar.noProject')}</p>
                                        {timeGroupedSessions.map(([key, group]) => (
                                            <div key={key}>
                                                <p className="px-3 py-0.5 text-[10px] text-muted-foreground">{t(`timeGroups.${key}`)}</p>
                                                {group.map(renderSessionItem)}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {/* Empty state */}
                                {!searchQuery && sessions.length === 0 && (
                                    <p className="text-xs text-muted-foreground text-center py-6">{t('sidebar.noPreviousSessions')}</p>
                                )}
                                {/* Search results */}
                                {searchQuery && (
                                    <div className="px-1">
                                        {filteredSessions.length === 0
                                            ? <p className="text-xs text-muted-foreground text-center py-4">{t('sidebar.noResults')}</p>
                                            : filteredSessions.map(({ session: s, snippet }) => (
                                                <div key={s.id}>
                                                    {renderSessionItem(s)}
                                                    {snippet && (
                                                        <p className="px-2 pb-2 text-[10px] text-muted-foreground dark:text-muted-foreground leading-snug italic line-clamp-2 -mt-0.5 cursor-pointer"
                                                            onClick={() => onNavigateSession(s.id)}>
                                                            {snippet}
                                                        </p>
                                                    )}
                                                </div>
                                            ))
                                        }
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </aside>

        </>
    );
}
