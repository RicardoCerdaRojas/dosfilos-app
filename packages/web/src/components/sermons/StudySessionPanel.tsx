import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, ExternalLink, Copy, Check, ChevronDown, ChevronUp, BookOpen, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { useFacultySessionById } from '@/hooks/faculty/useFacultySessionById';
import type { AIChatMessage } from '@dosfilos/domain';

interface StudySessionPanelProps {
    /** The faculty session ID stored in the sermon's sourceFacultySessionId field */
    sessionId: string;
    onClose?: () => void;
}

/**
 * Side panel displayed in the sermon editor when the sermon was generated
 * from a faculty (tutor) study session. Shows the full conversation history
 * so the pastor can reference theological insights and copy text into the sermon.
 */
export function StudySessionPanel({ sessionId, onClose }: StudySessionPanelProps) {
    const navigate = useNavigate();
    const { session, isLoading } = useFacultySessionById(sessionId);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

    const copyMessage = (id: string, content: string) => {
        navigator.clipboard.writeText(content);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const toggleCollapse = (id: string) => {
        setCollapsedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    // ── Loading skeleton ──────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <aside className="flex flex-col h-full border-l border-border bg-card animate-in slide-in-from-right duration-300">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                            <GraduationCap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <span className="text-sm font-semibold text-foreground">Sesión de Estudio</span>
                    </div>
                    {onClose && (
                        <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
                <div className="flex-1 flex items-center justify-center">
                    <div className="flex gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                </div>
            </aside>
        );
    }

    // ── Session not found ─────────────────────────────────────────────────────
    if (!session) {
        return (
            <aside className="flex flex-col h-full border-l border-border bg-card">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-indigo-500" />
                        <span className="text-sm font-semibold text-foreground">Sesión de Estudio</span>
                    </div>
                    {onClose && (
                        <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
                <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
                    <BookOpen className="w-8 h-8 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">La sesión de estudio ya no está disponible.</p>
                </div>
            </aside>
        );
    }

    // ── Main panel ────────────────────────────────────────────────────────────
    return (
        <aside className="flex flex-col h-full border-l border-border bg-card animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="px-4 py-3 border-b border-border shrink-0 bg-indigo-50/70 dark:bg-indigo-950/30">
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                            <GraduationCap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <span className="text-sm font-bold text-indigo-900 dark:text-indigo-100">
                            Sesión de Estudio
                        </span>
                    </div>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-1 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-200 transition-colors"
                            title="Cerrar panel"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
                <p className="text-xs text-indigo-700 dark:text-indigo-300 font-medium truncate leading-tight">
                    {session.title || 'Conversación Teológica'}
                </p>
                <p className="text-[10px] text-indigo-500 dark:text-indigo-400 mt-0.5">
                    {session.messages.length} mensajes
                </p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto divide-y divide-border/50">
                {session.messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-12 px-4 text-center">
                        <BookOpen className="w-7 h-7 text-muted-foreground/50" />
                        <p className="text-xs text-muted-foreground">Esta sesión no tiene mensajes.</p>
                    </div>
                ) : (
                    session.messages.map((msg: AIChatMessage) => {
                        const isUser = msg.role === 'user';
                        const isCollapsed = collapsedIds.has(msg.id);
                        const preview = msg.content.slice(0, 120) + (msg.content.length > 120 ? '…' : '');

                        return (
                            <div
                                key={msg.id}
                                className={cn(
                                    'px-3 py-3 group transition-colors',
                                    isUser
                                        ? 'bg-muted/30 hover:bg-muted/50'
                                        : 'bg-background hover:bg-muted/20'
                                )}
                            >
                                {/* Role badge + timestamp */}
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className={cn(
                                        'text-[10px] font-bold uppercase tracking-wider',
                                        isUser
                                            ? 'text-indigo-600 dark:text-indigo-400'
                                            : 'text-emerald-600 dark:text-emerald-400'
                                    )}>
                                        {isUser ? 'Tú' : 'Tutor'}
                                    </span>
                                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => copyMessage(msg.id, msg.content)}
                                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                            title="Copiar mensaje"
                                        >
                                            {copiedId === msg.id
                                                ? <Check className="w-3 h-3 text-emerald-500" />
                                                : <Copy className="w-3 h-3" />
                                            }
                                        </button>
                                        {msg.content.length > 120 && (
                                            <button
                                                onClick={() => toggleCollapse(msg.id)}
                                                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                                title={isCollapsed ? 'Expandir' : 'Colapsar'}
                                            >
                                                {isCollapsed
                                                    ? <ChevronDown className="w-3 h-3" />
                                                    : <ChevronUp className="w-3 h-3" />
                                                }
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Content */}
                                <div className={cn(
                                    'text-xs leading-relaxed text-foreground/90',
                                    isCollapsed && 'line-clamp-2'
                                )}>
                                    {isUser ? (
                                        <p className="whitespace-pre-wrap break-words">{isCollapsed ? preview : msg.content}</p>
                                    ) : (
                                        <div className="prose prose-xs prose-slate dark:prose-invert max-w-none break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                                            <ReactMarkdown>{isCollapsed ? preview : msg.content}</ReactMarkdown>
                                        </div>
                                    )}
                                </div>

                                {/* Expand/collapse hint for long messages */}
                                {msg.content.length > 120 && isCollapsed && (
                                    <button
                                        onClick={() => toggleCollapse(msg.id)}
                                        className="mt-1 text-[10px] text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium transition-colors"
                                    >
                                        Ver completo
                                    </button>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Footer: link to original session */}
            <div className="shrink-0 px-3 py-3 border-t border-border bg-card">
                <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:border-indigo-400"
                    onClick={() => navigate(`/dashboard/faculty/${sessionId}`)}
                >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Ir a la sesión completa
                </Button>
            </div>
        </aside>
    );
}
