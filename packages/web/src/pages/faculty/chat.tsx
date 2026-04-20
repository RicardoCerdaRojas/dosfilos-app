import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Send, Loader2, Sparkles, MessageSquareQuote, Download, Briefcase, BookOpen, Clock, GraduationCap, AlignLeft, AlignJustify, ChevronDown, ChevronRight, Copy, Check, Search, Trash2, FolderOpen, FolderPlus, Edit3, X, PanelLeftClose, PanelLeftOpen, SquarePen, Newspaper, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { useFacultyChat, useFacultySessions, useFacultyAgents } from '../../hooks/faculty';
import { useFacultyProjects } from '@/hooks/faculty/useFacultyProjects';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { SermonOutlinePreviewModal, type SermonOutline } from '@/components/faculty/SermonOutlinePreviewModal';
import { ProjectEditDialog } from './ProjectEditDialog';
import { type AIChatSession, type AIProject, type SermonPersonalization } from '@dosfilos/domain';
import { FacultyHomeContent } from './index';

// ── Module-level helpers ─────────────────────────────────────────────────────
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
function getTimeGroup(date: Date): string {
    const d = Math.floor((Date.now() - date.getTime()) / 86_400_000);
    if (d === 0) return 'Hoy';
    if (d === 1) return 'Ayer';
    if (d <= 7) return 'Esta semana';
    if (d <= 30) return 'Este mes';
    return 'Anteriores';
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
    isEditing, onSaveRename, onCancelRename
}: SessionItemProps) {
    const [localTitle, setLocalTitle] = React.useState(s.title || '');

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
                        ? 'bg-white dark:bg-zinc-900 border border-amber-200 dark:border-amber-900/30 shadow-sm'
                        : 'border border-transparent hover:bg-white dark:hover:bg-zinc-900 hover:border-slate-200 dark:hover:border-zinc-800'
                )}
            >
                <span className={cn('mt-0.5 w-2 h-2 rounded-full shrink-0', agentDotColor(s.agentId))} />
                <div className="flex-1 min-w-0">
                    {isEditing ? (
                        <input
                            autoFocus
                            className="w-full bg-white dark:bg-zinc-800 border border-amber-500 rounded px-1 py-0.5 text-xs focus:outline-none"
                            value={localTitle}
                            onChange={e => setLocalTitle(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onBlur={() => onCancelRename?.()}
                            onClick={e => e.stopPropagation()}
                        />
                    ) : (
                        <div className="font-medium text-slate-700 dark:text-slate-300 truncate leading-snug">{s.title || 'Conversación'}</div>
                    )}
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-slate-400">{formatDistanceToNow(s.updatedAt, { locale: es, addSuffix: true })}</span>
                        {s.messages.length > 0 && (
                            <span className="text-[10px] bg-slate-100 dark:bg-zinc-800 text-slate-500 px-1 rounded tabular-nums">{s.messages.length}</span>
                        )}
                    </div>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5 shrink-0 mt-0.5" onClick={e => e.stopPropagation()}>
                    {projects.length > 0 && (
                        <button
                            onClick={() => setOpenMenuId(isMenuOpen ? null : s.id)}
                            className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-400 hover:text-amber-500"
                            title="Mover a proyecto"
                        >
                            <FolderOpen className="w-3 h-3" />
                        </button>
                    )}
                    <button
                        onClick={onRename}
                        className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-400 hover:text-slate-600"
                        title="Renombrar conversación"
                    >
                        <Edit3 className="w-3 h-3" />
                    </button>
                    <button
                        onClick={onDelete}
                        className="p-0.5 rounded hover:bg-rose-50 dark:hover:bg-rose-900/20 text-slate-400 hover:text-rose-500"
                        title="Eliminar sesión"
                    >
                        <Trash2 className="w-3 h-3" />
                    </button>
                </div>
            </div>
            {isMenuOpen && (
                <div className="absolute right-1 top-8 z-20 w-44 rounded-lg shadow-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 py-1 text-xs">
                    <p className="px-3 py-1 text-[10px] text-slate-400 uppercase font-semibold tracking-wide">Mover a</p>
                    {projects.map(p => (
                        <button
                            key={p.id}
                            onClick={() => { onAssign(p.id); setOpenMenuId(null); }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-slate-300 text-left"
                        >
                            <span className={cn('w-2 h-2 rounded-full shrink-0', PROJECT_COLOR_BG[p.color] || 'bg-slate-400')} />
                            <span className="truncate">{p.title}</span>
                        </button>
                    ))}
                    {s.projectId && (
                        <button
                            onClick={() => { onAssign(null); setOpenMenuId(null); }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-500 text-left"
                        >
                            <X className="w-3 h-3 shrink-0" /><span>Quitar del proyecto</span>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

export function FacultyChatPage() {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // Route state flags
    const isHomeState = !sessionId;
    const isNewSession = sessionId === 'new';
    const effectiveSessionId = isHomeState || isNewSession ? '' : (sessionId ?? '');

    // Hooks
    const { sessions, isLoading: isLoadingSessions, deleteSession: deleteSessionMutation, createSession, renameSession } = useFacultySessions();
    const { projects, deleteProject: deleteProjectMutation, assignToProject } = useFacultyProjects();
    const { data: agents = [] } = useFacultyAgents();
    const {
        session,
        isLoadingSession,
        sendOrchestratedMessage,
        isOrchestrating,
        activeAgents,
        streamingMessage,
        isStreaming,
        extractContent,
        deleteMessage,
        isDeleting,
    } = useFacultyChat(effectiveSessionId);

    const isSending = isOrchestrating;

    // Agent context for new-session state (from URL params)
    const agentNameForNew = searchParams.get('agentName') ?? 'Orquestador de Tutores';
    const agentIdForNew = searchParams.get('agent') ?? '';

    const [input, setInput] = useState('');
    // Sidebar open by default — persisted in localStorage
    const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(
        () => localStorage.getItem('faculty-sidebar') !== 'false'
    );
    const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
    const [lengthPreference, setLengthPreference] = useState<'concise' | 'detailed'>('detailed');
    const [extractedContent, setExtractedContent] = useState<{ title: string; markdown: string } | null>(null);
    const [copied, setCopied] = useState(false);
    const [sermonOutline, setSermonOutline] = useState<SermonOutline | null>(null);
    const [extractingType, setExtractingType] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatScrollRef = useRef<HTMLDivElement>(null);
    // true = user scrolled up intentionally; we stop forcing the scroll
    const userScrolledUp = useRef(false);
    // Sidebar state
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
    const [projectDialog, setProjectDialog] = useState<{ mode: 'create' } | { mode: 'edit'; project: AIProject } | null>(null);
    const [sessionMenuId, setSessionMenuId] = useState<string | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [renameConfirmId, setRenameConfirmId] = useState<string | null>(null);
    // Derived sidebar data
    const ungroupedSessions = useMemo(() => sessions.filter(s => !s.projectId), [sessions]);
    const filteredSessions = useMemo(() => {
        if (!searchQuery) return [];
        const q = searchQuery.toLowerCase();
        return sessions
            .filter(s =>
                (s.title || 'Conversación').toLowerCase().includes(q) ||
                s.messages.some(m => m.content.toLowerCase().includes(q))
            )
            .map(s => {
                // If the title matched, no snippet needed
                if ((s.title || 'Conversación').toLowerCase().includes(q))
                    return { session: s, snippet: null as string | null };
                // Find the first message with a match and extract a context snippet
                const msg = s.messages.find(m => m.content.toLowerCase().includes(q));
                if (!msg) return { session: s, snippet: null as string | null };
                const idx = msg.content.toLowerCase().indexOf(q);
                const start = Math.max(0, idx - 30);
                const end = Math.min(msg.content.length, idx + q.length + 60);
                const snippet = `${start > 0 ? '…' : ''}${msg.content.slice(start, end)}${end < msg.content.length ? '…' : ''}`;
                return { session: s, snippet };
            });
    }, [sessions, searchQuery]);
    const timeGroupedSessions = useMemo(() => {
        const groups: Record<string, AIChatSession[]> = {};
        for (const s of ungroupedSessions) { const l = getTimeGroup(s.updatedAt); (groups[l] ??= []).push(s); }
        return (['Hoy', 'Ayer', 'Esta semana', 'Este mes', 'Anteriores'] as const)
            .filter(l => groups[l]).map(l => [l, groups[l]] as [string, AIChatSession[]]);
    }, [ungroupedSessions]);

    const toggleSidebar = () => {
        setIsLeftSidebarOpen(prev => {
            const next = !prev;
            localStorage.setItem('faculty-sidebar', String(next));
            return next;
        });
    };

    /**
     * Scrolls to the bottom of the chat. Used only when the user
     * explicitly sends a message (force = true) or when auto-scroll
     * is enabled (user is already near the bottom).
     */
    const scrollToBottom = (force = false) => {
        const container = chatScrollRef.current;
        if (!container) return;
        if (force || !userScrolledUp.current) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    };

    // Detect when the user scrolls away from the bottom
    useEffect(() => {
        const container = chatScrollRef.current;
        if (!container) return;

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = container;
            // Consider "near bottom" if within 150px of the bottom
            const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
            userScrolledUp.current = distanceFromBottom > 150;
        };

        container.addEventListener('scroll', handleScroll, { passive: true });
        return () => container.removeEventListener('scroll', handleScroll);
    }, []);

    // Auto-send the initial orchestrated question passed via ?q= URL param
    const hasAutoSent = useRef<Record<string, boolean>>({});
    
    useEffect(() => {
        const initialQuestion = searchParams.get('q');
        const sessionKey = effectiveSessionId || 'new';
        
        if (
            initialQuestion &&
            !hasAutoSent.current[sessionKey] &&
            !isSending &&
            !isStreaming
        ) {
            hasAutoSent.current[sessionKey] = true;
            
            const handleInitialQuestion = async () => {
                // If we're in the 'new' route, we MUST create a session first
                if (isNewSession) {
                    const targetAgentId = agentIdForNew || agents.find(a => a.isActive)?.id || agents[0]?.id || '';
                    if (!targetAgentId) return;
                    
                    try {
                        const newSession = await createSession.mutateAsync({ agentId: targetAgentId });
                        // We must wait for the new route to mount and the sessionQuery to have data
                        // Let the navigation happen, and pass the ?q= forward again 
                        // so the new mounted component handles it.
                        navigate(`/dashboard/faculty/${newSession.id}?q=${encodeURIComponent(initialQuestion)}`, { replace: true });
                        return;
                    } catch (err) {
                        console.error('Failed to create initial session:', err);
                        setInput(initialQuestion);
                        return;
                    }
                }
                
                // If we are already in a valid session and it's loaded, we can send
                if (session && session.messages.length === 0) {
                     // Remove ?q from the URL so a page refresh doesn't re-send
                     setSearchParams({}, { replace: true });
                     setTimeout(() => {
                         sendOrchestratedMessage({ message: initialQuestion, lengthPreference });
                     }, 100);
                } else if (!session) {
                    // Session is not loaded yet, allow the effect to re-run when it is
                    hasAutoSent.current[sessionKey] = false;
                }
            };
            
            handleInitialQuestion();
        }
    }, [isNewSession, effectiveSessionId, session, searchParams, isSending, isStreaming, sendOrchestratedMessage, lengthPreference, setSearchParams, createSession, navigate, agentIdForNew, agents]);

    // Auto-scroll: only follow the bottom when user hasn't scrolled up
    useEffect(() => {
        scrollToBottom();
    }, [streamingMessage, session?.messages]);

    const handleRename = (id: string, newTitle: string) => {
        if (!newTitle.trim()) {
            setRenameConfirmId(null);
            return;
        }
        renameSession.mutate({ sessionId: id, title: newTitle.trim() });
        setRenameConfirmId(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage(e as unknown as React.FormEvent);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isSending || isStreaming) return;

        const userMsg = input;
        setInput('');
        // User sent a message: always scroll to bottom and re-enable auto-scroll
        userScrolledUp.current = false;
        scrollToBottom(true);

        // Lazy session creation — only create the DB record on first message
        if (isNewSession) {
            const targetAgentId = agentIdForNew || agents.find(a => a.isActive)?.id || agents[0]?.id || '';
            if (!targetAgentId) { setInput(userMsg); return; }
            try {
                const newSession = await createSession.mutateAsync({ agentId: targetAgentId });
                navigate(`/dashboard/faculty/${newSession.id}?q=${encodeURIComponent(userMsg)}`, { replace: true });
            } catch (err) {
                console.error('Failed to create session:', err);
                setInput(userMsg);
            }
            return;
        }

        try {
            await sendOrchestratedMessage({ message: userMsg, lengthPreference });
        } catch (error) {
            console.error('Failed to send message:', error);
            // Restore input only if it was cleared and sending failed
            setInput(userMsg);
        }
    };

    const EXTRACTION_TITLES: Record<string, string> = {
        SERMON: 'Bosquejo de Sermón',
        BIBLE_STUDY: 'Guía de Estudio Bíblico',
        COUNSELING_TASK: 'Tareas Noutéticas',
        NEWSLETTER: 'Boletín Dominical',
        SYSTEMATIC_THEOLOGY_PAPER: 'Paper Teológico',
    };

    const handleExtract = async (type: any) => {
        if (extractingType) return; // Prevent concurrent extractions
        setExtractingType(type);
        try {
            // Sermon uses a 2-step flow: outline preview → full generation
            if (type === 'SERMON') {
                const raw = await extractContent({ type: 'SERMON_OUTLINE' });
                const json = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
                const outline: SermonOutline = JSON.parse(json);
                setSermonOutline(outline);
                return;
            }

            // All other types use the existing markdown dialog
            const result = await extractContent({ type });
            setExtractedContent({
                title: EXTRACTION_TITLES[type] || 'Documento Extraído',
                markdown: result
            });
        } catch (error) {
            console.error('Extraction failed:', error);
            toast.error('No se pudo generar el contenido. Intenta de nuevo.');
        } finally {
            setExtractingType(null);
        }
    };

    const handleGenerateFullSermon = async (approvedOutline: SermonOutline, personalization?: SermonPersonalization): Promise<string> => {
        return await extractContent({ type: 'SERMON', approvedOutline, personalization });
    };

    const handleCopy = () => {
        if (!extractedContent) return;
        navigator.clipboard.writeText(extractedContent.markdown);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };


    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-50 dark:bg-zinc-950 font-sans">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 bg-white dark:bg-zinc-900 border-b shrink-0 shadow-sm z-10">
                <div className="flex items-center gap-4">
                    {/* Back button — hidden on the home state */}
                    {!isHomeState && (
                        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/faculty')} className="hover:bg-slate-100 dark:hover:bg-zinc-800">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    )}
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
                            <span className="text-lg">🎓</span>
                        </div>
                        <div>
                            <h1 className="text-lg font-bold leading-none tracking-tight">
                                {isHomeState ? 'Mis Tutores' : isNewSession ? agentNameForNew : (session?.title || 'Sesión Activa')}
                            </h1>
                            {!isHomeState && !isNewSession && session?.agentId && (
                                <p className="text-[13px] text-muted-foreground mt-1 font-medium font-mono text-xs">Profesor ID: {session.agentId}</p>
                            )}
                            {isNewSession && (
                                <p className="text-[13px] text-muted-foreground mt-0.5 text-xs">Nueva sesión — escribe tu primera pregunta</p>
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
                                title="Longitud de la respuesta de la IA"
                            >
                                {lengthPreference === 'concise' ? <AlignLeft className="w-4 h-4 text-indigo-500" /> : <AlignJustify className="w-4 h-4 text-indigo-500" />}
                                <span className="text-xs font-semibold">{lengthPreference === 'concise' ? 'Respuesta Breve' : 'Respuesta Detallada'}</span>
                                <ChevronDown className="w-3 h-3 ml-1 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem onClick={() => setLengthPreference('concise')} className={cn("cursor-pointer", lengthPreference === 'concise' && 'bg-indigo-50 font-medium text-indigo-900 dark:bg-indigo-900/30 dark:text-indigo-200')}>
                                <AlignLeft className="w-4 h-4 mr-2 text-indigo-500" />
                                Breve y concisa
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setLengthPreference('detailed')} className={cn("cursor-pointer", lengthPreference === 'detailed' && 'bg-indigo-50 font-medium text-indigo-900 dark:bg-indigo-900/30 dark:text-indigo-200')}>
                                <AlignJustify className="w-4 h-4 mr-2 text-indigo-500" />
                                Detallada y exhaustiva
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <div className="h-4 w-px bg-slate-200 dark:bg-zinc-700 mx-1 hidden sm:block"></div>
                    
                    <Button 
                        variant={isLeftSidebarOpen ? "secondary" : "ghost"} 
                        size="sm" 
                        onClick={toggleSidebar}
                        className={cn("hidden md:flex items-center gap-2 transition-colors", isLeftSidebarOpen && "bg-slate-100 dark:bg-zinc-800")}
                        title="Proyectos y Sesiones"
                    >
                        <Clock className="w-4 h-4" />
                        <span className="text-xs font-semibold">Sesiones</span>
                    </Button>
                    <Button 
                        variant={isRightSidebarOpen ? "secondary" : "ghost"} 
                        size="sm" 
                        onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)} 
                        className={cn("hidden lg:flex items-center gap-2 transition-colors", isRightSidebarOpen && "bg-slate-100 dark:bg-zinc-800")}
                        title="Extracción de Contenido"
                    >
                        <Download className="w-4 h-4" />
                        <span className="text-xs font-semibold">Extraer</span>
                    </Button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Left: History Sidebar */}
                <aside className={cn(
                    'border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/50 hidden md:flex flex-col shrink-0 transition-all duration-300 ease-in-out',
                    isLeftSidebarOpen ? 'w-64 border-r opacity-100' : 'w-0 border-r-0 opacity-0 overflow-hidden'
                )}>
                    <div className="w-64 flex flex-col h-full overflow-x-hidden">
                        {/* Action bar */}
                        <div className="px-2 py-2 flex items-center justify-between border-b border-slate-100 dark:border-zinc-800/50 shrink-0">
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Mis Sesiones</span>
                            <div className="flex items-center gap-0.5">
                                <button
                                    onClick={() => navigate('/dashboard/faculty/new')}
                                    className="p-1.5 rounded-md hover:bg-amber-50 dark:hover:bg-amber-900/20 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                                    title="Nueva conversación"
                                >
                                    <SquarePen className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => setProjectDialog({ mode: 'create' })}
                                    className="p-1.5 rounded-md hover:bg-amber-50 dark:hover:bg-amber-900/20 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                                    title="Nuevo proyecto"
                                >
                                    <FolderPlus className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={toggleSidebar}
                                    className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                    title="Colapsar panel"
                                >
                                    <PanelLeftClose className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                        {/* Search bar */}
                        <div className="p-2.5 border-b border-slate-100 dark:border-zinc-800/50 shrink-0">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                                <input
                                    type="text"
                                    placeholder="Buscar sesiones..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full py-1.5 pl-8 pr-7 text-xs rounded-md border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-400/60 placeholder:text-slate-400"
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>
                        {/* Scrollable list */}
                        <div className="flex-1 overflow-y-auto overflow-x-hidden py-1">
                            {isLoadingSessions ? (
                                <div className="p-4 flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-slate-400" /></div>
                            ) : (
                                <>
                                    {/* ── Projects ── */}
                                    {!searchQuery && (
                                        <div>
                                            {projects.map(project => {
                                                const isExpanded = expandedProjects.has(project.id);
                                                const pSessions = sessions.filter(s => s.projectId === project.id);
                                                const colorBg = PROJECT_COLOR_BG[project.color] || 'bg-slate-400';
                                                return (
                                                    <div key={project.id}>
                                                        <div className="group flex items-center px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800/60">
                                                            <button
                                                                onClick={() => setExpandedProjects(prev => { const n = new Set(prev); isExpanded ? n.delete(project.id) : n.add(project.id); return n; })}
                                                                className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
                                                            >
                                                                <ChevronRight className={cn('w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0', isExpanded && 'rotate-90')} />
                                                                <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', colorBg)} />
                                                                <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{project.title}</span>
                                                                {pSessions.length > 0 && <span className="ml-auto text-[10px] text-slate-400 tabular-nums shrink-0 pl-1">{pSessions.length}</span>}
                                                            </button>
                                                            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1">
                                                                <button onClick={e => { e.stopPropagation(); setProjectDialog({ mode: 'edit', project }); }}
                                                                    className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-400 hover:text-slate-600" title="Editar proyecto">
                                                                    <Edit3 className="w-3 h-3" />
                                                                </button>
                                                                <button onClick={e => { e.stopPropagation(); deleteProjectMutation.mutate(project.id); }}
                                                                    className="p-0.5 rounded hover:bg-rose-50 dark:hover:bg-rose-900/20 text-slate-400 hover:text-rose-500" title="Eliminar proyecto">
                                                                    <Trash2 className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                        {isExpanded && (
                                                            <div className="pl-5 ml-3 border-l border-slate-200 dark:border-zinc-700/50 mb-1">
                                                                {pSessions.length === 0
                                                                    ? <p className="text-[11px] text-slate-400 px-2 py-1.5 italic">Sin sesiones aún</p>
                                                                    : pSessions.map(s => (
                                                                        <SessionItem key={s.id} session={s} isActive={s.id === sessionId} projects={projects}
                                                                            openMenuId={sessionMenuId} setOpenMenuId={setSessionMenuId}
                                                                            onNavigate={() => navigate(`/dashboard/faculty/${s.id}`)}
                                                                            onDelete={() => setDeleteConfirmId(s.id)}
                                                                            onRename={() => setRenameConfirmId(s.id)}
                                                                            onAssign={pid => assignToProject.mutate({ sessionId: s.id, projectId: pid })}
                                                                            isEditing={renameConfirmId === s.id}
                                                                            onSaveRename={newTitle => handleRename(s.id, newTitle)}
                                                                            onCancelRename={() => setRenameConfirmId(null)}
                                                                        />
                                                                    ))
                                                                }
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {/* ── Sin Proyecto ── */}
                                    {!searchQuery && ungroupedSessions.length > 0 && (
                                        <div className="mt-1">
                                            <p className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Sin proyecto</p>
                                            {timeGroupedSessions.map(([label, group]) => (
                                                <div key={label}>
                                                    <p className="px-3 py-0.5 text-[10px] text-slate-400">{label}</p>
                                                    {group.map(s => (
                                                        <SessionItem key={s.id} session={s} isActive={s.id === sessionId} projects={projects}
                                                            openMenuId={sessionMenuId} setOpenMenuId={setSessionMenuId}
                                                            onNavigate={() => navigate(`/dashboard/faculty/${s.id}`)}
                                                            onDelete={() => setDeleteConfirmId(s.id)}
                                                            onRename={() => setRenameConfirmId(s.id)}
                                                            onAssign={pid => assignToProject.mutate({ sessionId: s.id, projectId: pid })}
                                                            isEditing={renameConfirmId === s.id}
                                                            onSaveRename={newTitle => handleRename(s.id, newTitle)}
                                                            onCancelRename={() => setRenameConfirmId(null)}
                                                        />
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {/* Empty state */}
                                    {!searchQuery && sessions.length === 0 && (
                                        <p className="text-xs text-slate-400 text-center py-6">No hay sesiones previas.</p>
                                    )}
                                    {/* Search results */}
                                    {searchQuery && (
                                        <div className="px-1">
                                            {filteredSessions.length === 0
                                                ? <p className="text-xs text-slate-400 text-center py-4">Sin resultados</p>
                                                : filteredSessions.map(({ session: s, snippet }) => (
                                                    <div key={s.id}>
                                                        <SessionItem session={s} isActive={s.id === sessionId} projects={projects}
                                                            openMenuId={sessionMenuId} setOpenMenuId={setSessionMenuId}
                                                            onNavigate={() => navigate(`/dashboard/faculty/${s.id}`)}
                                                            onDelete={() => setDeleteConfirmId(s.id)}
                                                            onRename={() => setRenameConfirmId(s.id)}
                                                            onAssign={pid => assignToProject.mutate({ sessionId: s.id, projectId: pid })}
                                                            isEditing={renameConfirmId === s.id}
                                                            onSaveRename={newTitle => handleRename(s.id, newTitle)}
                                                            onCancelRename={() => setRenameConfirmId(null)}
                                                        />
                                                        {snippet && (
                                                            <p className="px-2 pb-2 text-[10px] text-slate-400 dark:text-slate-500 leading-snug italic line-clamp-2 -mt-0.5 cursor-pointer"
                                                               onClick={() => navigate(`/dashboard/faculty/${s.id}`)}>
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

                {/* Collapse-state expand tab — visible only when sidebar is closed */}
                {!isLeftSidebarOpen && (
                    <button
                        onClick={toggleSidebar}
                        className="hidden md:flex flex-col items-center gap-2 pt-3 w-12 shrink-0 border-r border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-amber-50 dark:hover:bg-amber-900/10 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                        title="Abrir panel"
                    >
                        <PanelLeftOpen className="w-4 h-4" />
                    </button>
                )}

                {/* Center: Main Chat Area */}
                <main className="flex-1 flex flex-col min-w-0 bg-transparent relative z-0">
                    {/* Home state: overlay the full directory page — sidebar stays visible */}
                    {isHomeState && (
                        <div className="absolute inset-0 z-10 overflow-y-auto bg-slate-50 dark:bg-zinc-950">
                            <FacultyHomeContent />
                        </div>
                    )}
                    <div ref={chatScrollRef} className="flex-1 overflow-y-auto px-4 py-8 scroll-smooth">
                        <div className="max-w-3xl mx-auto w-full flex flex-col gap-6 pb-28">
                            {/* Loading state - encapsulated inside the message area to prevent layout jumps */}
                            {isLoadingSession ? (
                                <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-500">
                                    <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-4" />
                                    <p className="text-sm text-slate-500 font-medium">Cargando conversación...</p>
                                </div>
                            ) : (
                                <>
                                    {/* New-session blank state */}
                                    {isNewSession && !isStreaming && !isSending && (
                                        <div className="text-center py-20 text-slate-500">
                                            <div className="w-16 h-16 mx-auto bg-amber-100 rounded-full flex items-center justify-center mb-4">
                                                <GraduationCap className="w-8 h-8 text-amber-500" />
                                            </div>
                                            <h3 className="text-lg font-medium text-slate-800 mb-2">{agentNameForNew}</h3>
                                            <p className="max-w-md mx-auto">Escribe tu primera pregunta para comenzar la conversación.</p>
                                        </div>
                                    )}
                                </>
                            )}
                            {/* Existing session blank state */}
                            {!isNewSession && session?.messages.length === 0 && !isStreaming && !isSending && (
                                <div className="text-center py-20 text-slate-500">
                                    <div className="w-16 h-16 mx-auto bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                                        <GraduationCap className="w-8 h-8 text-indigo-500" />
                                    </div>
                                    <h3 className="text-lg font-medium text-slate-800 mb-2">Comienza la Sesión</h3>
                                    <p className="max-w-md mx-auto">Hazle una pregunta a este profesor sobre su área de especialidad teológica o pastoral.</p>
                                </div>
                            )}

                            {session?.messages.map((msg, i) => (
                                <div key={i} className={cn("flex w-full gap-4 group", msg.role === 'user' ? "justify-end" : "justify-start")}>
                                    {msg.role !== 'user' && (
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 border border-indigo-200 dark:from-indigo-900 dark:to-indigo-800 flex items-center justify-center shrink-0 mt-3 shadow-sm">
                                            <MessageSquareQuote className="h-4 w-4 text-indigo-700 dark:text-indigo-300" />
                                        </div>
                                    )}
                                    <div className={cn(
                                            "relative text-[15px] leading-relaxed",
                                            msg.role === 'user'
                                                ? "bg-indigo-600 text-white rounded-3xl rounded-tr-sm px-6 py-3.5 max-w-[85%] md:max-w-[70%] shadow-sm font-medium"
                                                : "flex-1 min-w-0 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-sm rounded-3xl rounded-tl-sm px-6 py-5"
                                        )}
                                    >
                                        {msg.role === 'user' ? (
                                            <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                                        ) : (
                                            <div className="prose prose-slate prose-sm md:prose-base dark:prose-invert max-w-none break-words">
                                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                                            </div>
                                        )}

                                        {/* Individual message deletion */}
                                        {msg.id && (
                                            <button
                                                onClick={() => deleteMessage(msg.id)}
                                                disabled={isDeleting}
                                                className={cn(
                                                    "absolute top-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30",
                                                    msg.role === 'user' ? "-left-10 text-slate-400 hover:text-rose-500" : "right-2 text-slate-400 hover:text-rose-500"
                                                )}
                                                title="Eliminar mensaje"
                                            >
                                                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {(isStreaming || isSending) && (
                                <div className="flex w-full gap-4 justify-start animate-in fade-in duration-300">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 border border-indigo-200 flex items-center justify-center shrink-0 mt-3 shadow-sm">
                                        <Sparkles className="h-4 w-4 text-indigo-600 animate-pulse" />
                                    </div>
                                    <div className="flex-1 min-w-0 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-sm rounded-3xl rounded-tl-sm px-6 py-5">
                                        {/* Active agent attribution */}
                                        <div className="text-xs text-indigo-500 font-semibold mb-2 flex items-center gap-1.5">
                                            <Sparkles className="h-3 w-3" />
                                            {activeAgents.length > 0
                                                ? activeAgents.map(a => a.name).join(' + ')
                                                : 'Seleccionando especialista...'}
                                        </div>
                                        {streamingMessage ? (
                                            <div className="prose prose-slate prose-sm md:prose-base dark:prose-invert max-w-none break-words">
                                                <ReactMarkdown>{streamingMessage}</ReactMarkdown>
                                                <span className="inline-block w-1.5 h-4 ml-1 bg-indigo-500 animate-pulse align-middle"></span>
                                            </div>
                                        ) : (
                                            <div className="flex gap-1.5 align-middle h-6 items-center">
                                                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                                                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                                                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} className="h-2" />
                        </div>
                    </div>

                    {/* Floating Input Area — hidden on the home page */}
                    <div className={cn("absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-50 via-slate-50 dark:from-zinc-950 dark:via-zinc-950 to-transparent pt-12 pb-6 px-4 pointer-events-none", isHomeState && "hidden")}>
                        <div className="max-w-3xl mx-auto relative pointer-events-auto">
                            <form
                                onSubmit={handleSendMessage}
                                className="relative flex items-end shadow-lg rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 focus-within:border-indigo-300/70 dark:focus-within:border-indigo-500/50 focus-within:shadow-indigo-100 dark:focus-within:shadow-indigo-950/30 transition-all overflow-hidden"
                            >
                                    <Textarea
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder={isLoadingSession ? "Cargando..." : "Continúa la conversación teológica..."}
                                        className="border-0 outline-none focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 ring-0 rounded-none w-full min-h-[56px] max-h-[200px] py-4 pl-6 pr-14 text-[15px] bg-transparent font-medium shadow-none resize-none transition-[height]"
                                        style={{ fieldSizing: 'content' } as any}
                                        disabled={isSending || isStreaming || isLoadingSession}
                                    />
                                    <div className="absolute right-2 bottom-2">
                                        <Button 
                                            type="submit" 
                                            size="icon" 
                                            className={cn(
                                                "h-10 w-10 rounded-full transition-all duration-300 shadow-sm",
                                                input.trim() ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "bg-slate-100 text-slate-400 dark:bg-zinc-800"
                                            )}
                                            disabled={isSending || isStreaming || isLoadingSession || !input.trim()}
                                        >
                                        {(isSending || isStreaming) && !streamingMessage ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-4 w-4 ml-0.5" />}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                </main>

                {/* Right: Extraction Panel */}
                <aside className={cn(
                    "border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hidden lg:flex flex-col shrink-0 shadow-[-10px_0_30px_rgba(0,0,0,0.02)] transition-all duration-300 ease-in-out",
                    isRightSidebarOpen ? "w-80 border-l opacity-100" : "w-0 border-l-0 opacity-0 overflow-hidden"
                )}>
                    <div className="p-6 border-b border-slate-100 dark:border-zinc-800/50 flex flex-col gap-1 w-80">
                        <h3 className="font-semibold flex items-center gap-2 text-slate-800 dark:text-slate-100">
                            <Download className="w-4 h-4 text-indigo-500" />
                            Extracción de Contenido
                        </h3>
                        <p className="text-xs text-muted-foreground">Convierte esta conversación en documentos estructurados listos para usar.</p>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        <Button 
                            variant="outline" 
                            onClick={() => handleExtract('SERMON')}
                            disabled={!!extractingType || (session?.messages.length || 0) < 2}
                            className="w-full justify-start h-auto p-4 flex flex-col items-start gap-1 hover:border-indigo-500 hover:bg-indigo-50"
                        >
                            <div className="flex items-center gap-2 font-semibold text-slate-800">
                                {extractingType === 'SERMON' ? <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" /> : <BookOpen className="w-4 h-4 text-emerald-600" />}
                                Bosquejo de Sermón
                            </div>
                            <span className="text-xs text-slate-500 font-normal text-left whitespace-normal">Estructura expositiva completa con puntos y aplicación.</span>
                        </Button>

                        <Button 
                            variant="outline" 
                            onClick={() => handleExtract('BIBLE_STUDY')}
                            disabled={!!extractingType || (session?.messages.length || 0) < 2}
                            className="w-full justify-start h-auto p-4 flex flex-col items-start gap-1 hover:border-indigo-500 hover:bg-indigo-50"
                        >
                            <div className="flex items-center gap-2 font-semibold text-slate-800">
                                {extractingType === 'BIBLE_STUDY' ? <Loader2 className="w-4 h-4 text-blue-600 animate-spin" /> : <Briefcase className="w-4 h-4 text-blue-600" />}
                                Guía de Estudio
                            </div>
                            <span className="text-xs text-slate-500 font-normal text-left whitespace-normal">Preguntas para grupos pequeños derivadas del tema.</span>
                        </Button>
                        
                        <Button 
                            variant="outline" 
                            onClick={() => handleExtract('COUNSELING_TASK')}
                            disabled={!!extractingType || (session?.messages.length || 0) < 2}
                            className="w-full justify-start h-auto p-4 flex flex-col items-start gap-1 hover:border-indigo-500 hover:bg-indigo-50"
                        >
                            <div className="flex items-center gap-2 font-semibold text-slate-800">
                                {extractingType === 'COUNSELING_TASK' ? <Loader2 className="w-4 h-4 text-amber-600 animate-spin" /> : <MessageSquareQuote className="w-4 h-4 text-amber-600" />}
                                Tareas Noutéticas
                            </div>
                            <span className="text-xs text-slate-500 font-normal text-left whitespace-normal">Asignaciones bíblicas para el aconsejado.</span>
                        </Button>

                        <Button 
                            variant="outline" 
                            onClick={() => handleExtract('NEWSLETTER')}
                            disabled={!!extractingType || (session?.messages.length || 0) < 2}
                            className="w-full justify-start h-auto p-4 flex flex-col items-start gap-1 hover:border-indigo-500 hover:bg-indigo-50"
                        >
                            <div className="flex items-center gap-2 font-semibold text-slate-800">
                                {extractingType === 'NEWSLETTER' ? <Loader2 className="w-4 h-4 text-rose-600 animate-spin" /> : <Newspaper className="w-4 h-4 text-rose-600" />}
                                Boletín Dominical
                            </div>
                            <span className="text-xs text-slate-500 font-normal text-left whitespace-normal">Artículo devocional para la newsletter de la iglesia.</span>
                        </Button>

                        <Button 
                            variant="outline" 
                            onClick={() => handleExtract('SYSTEMATIC_THEOLOGY_PAPER')}
                            disabled={!!extractingType || (session?.messages.length || 0) < 2}
                            className="w-full justify-start h-auto p-4 flex flex-col items-start gap-1 hover:border-indigo-500 hover:bg-indigo-50"
                        >
                            <div className="flex items-center gap-2 font-semibold text-slate-800">
                                {extractingType === 'SYSTEMATIC_THEOLOGY_PAPER' ? <Loader2 className="w-4 h-4 text-purple-600 animate-spin" /> : <FileText className="w-4 h-4 text-purple-600" />}
                                Ensayo Teológico
                            </div>
                            <span className="text-xs text-slate-500 font-normal text-left whitespace-normal">Paper académico con rigor doctrinal reformado.</span>
                        </Button>
                    </div>
                </aside>
            </div>

            {/* Extraction Result Dialog */}
            <Dialog open={!!extractedContent} onOpenChange={(open) => !open && setExtractedContent(null)}>
                <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
                    <DialogHeader className="flex flex-row items-center justify-between pr-8 shrink-0">
                        <DialogTitle className="text-lg font-bold">{extractedContent?.title}</DialogTitle>
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 h-8"
                            onClick={handleCopy}
                        >
                            {copied
                                ? <><Check className="h-3.5 w-3.5 text-green-600" /> Copiado</>
                                : <><Copy className="h-3.5 w-3.5" /> Copiar</>
                            }
                        </Button>
                    </DialogHeader>
                    <div className="overflow-y-auto flex-1 pr-1">
                        <div className="prose prose-sm prose-slate dark:prose-invert max-w-none">
                            <ReactMarkdown>{extractedContent?.markdown || ''}</ReactMarkdown>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Sermon Outline Preview Modal (2-step sermon creation) */}
            <SermonOutlinePreviewModal
                outline={sermonOutline}
                sessionId={effectiveSessionId || undefined}
                onClose={() => setSermonOutline(null)}
                onGenerateFullSermon={handleGenerateFullSermon}
            />
            {/* Project create/edit dialog */}
            {projectDialog && (
                <ProjectEditDialog
                    project={'project' in projectDialog ? (projectDialog as { mode: 'edit'; project: AIProject }).project : undefined}
                    onClose={() => setProjectDialog(null)}
                />
            )}


            {/* Delete Session Confirmation */}
            <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar esta sesión?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Se eliminarán permanentemente todos los mensajes de esta conversación.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (deleteConfirmId) {
                                    deleteSessionMutation.mutate(deleteConfirmId);
                                    setDeleteConfirmId(null);
                                }
                            }}
                            className="bg-rose-600 hover:bg-rose-700 text-white"
                        >
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
