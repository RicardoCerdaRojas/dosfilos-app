import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
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
import { Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';
import { useFacultyChat, useFacultySessions, useFacultyAgents } from '../../hooks/faculty';
import { useFacultyProjects } from '@/hooks/faculty/useFacultyProjects';
import { SermonOutlinePreviewModal, type SermonOutline } from '@/components/faculty/SermonOutlinePreviewModal';
import { FacultyChatHeader } from '@/components/faculty/FacultyChatHeader';
import { FacultySessionSidebar } from '@/components/faculty/FacultySessionSidebar';
import { FacultyExtractionPanel } from '@/components/faculty/FacultyExtractionPanel';
import { FacultyChatMessages } from '@/components/faculty/FacultyChatMessages';
import { FacultyChatInput } from '@/components/faculty/FacultyChatInput';
import { FacultyDocumentEditor } from '@/components/faculty/FacultyDocumentEditor';
import { ProjectEditDialog } from './ProjectEditDialog';
import { type AIProject, type SermonPersonalization } from '@dosfilos/domain';
import { FacultyHomeContent } from './index';

// ── Extraction type-to-key mapping ───────────────────────────────────────────

const EXTRACTION_TITLE_KEYS: Record<string, string> = {
    SERMON: 'extraction.sermonOutline',
    BIBLE_STUDY: 'extraction.bibleStudy',
    COUNSELING_TASK: 'extraction.counselingTask',
    NEWSLETTER: 'extraction.newsletter',
    SYSTEMATIC_THEOLOGY_PAPER: 'extraction.theologyPaper',
};

export function FacultyChatPage() {
    const { t } = useTranslation('faculty');
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // ── Route state ──────────────────────────────────────────────────────────
    const isHomeState = !sessionId;
    const isNewSession = sessionId === 'new';
    const effectiveSessionId = isHomeState || isNewSession ? '' : (sessionId ?? '');

    // ── Hooks ────────────────────────────────────────────────────────────────
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
        processMicroAction,
        isProcessingMicroAction,
    } = useFacultyChat(effectiveSessionId);

    const isSending = isOrchestrating;

    // ── Agent context for new sessions ───────────────────────────────────────
    const agentNameForNew = searchParams.get('agentName') ?? 'Orquestador de Tutores';
    const agentIdForNew = searchParams.get('agent') ?? '';

    // ── Local state ──────────────────────────────────────────────────────────
    const [input, setInput] = useState('');
    const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(
        () => localStorage.getItem('faculty-sidebar') !== 'false'
    );
    const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
    const [lengthPreference, setLengthPreference] = useState<'concise' | 'detailed'>('detailed');
    const [extractedContent, setExtractedContent] = useState<{ title: string; markdown: string } | null>(null);
    const [sermonOutline, setSermonOutline] = useState<SermonOutline | null>(null);
    const [extractingType, setExtractingType] = useState<string | null>(null);
    const [projectDialog, setProjectDialog] = useState<{ mode: 'create' } | { mode: 'edit'; project: AIProject } | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [renameConfirmId, setRenameConfirmId] = useState<string | null>(null);
    const [isZenMode, setIsZenMode] = useState(false);

    // ── Scroll management ────────────────────────────────────────────────────
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatScrollRef = useRef<HTMLDivElement>(null);
    const userScrolledUp = useRef(false);

    const scrollToBottom = (force = false) => {
        const container = chatScrollRef.current;
        if (!container) return;
        if (force || !userScrolledUp.current) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    };

    useEffect(() => {
        const container = chatScrollRef.current;
        if (!container) return;
        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = container;
            userScrolledUp.current = (scrollHeight - scrollTop - clientHeight) > 150;
        };
        container.addEventListener('scroll', handleScroll, { passive: true });
        return () => container.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => { scrollToBottom(); }, [streamingMessage, session?.messages]);

    // ── Auto-send initial question from ?q= ──────────────────────────────────
    const hasAutoSent = useRef<Record<string, boolean>>({});

    useEffect(() => {
        const initialQuestion = searchParams.get('q');
        const sessionKey = effectiveSessionId || 'new';

        if (initialQuestion && !hasAutoSent.current[sessionKey] && !isSending && !isStreaming) {
            hasAutoSent.current[sessionKey] = true;

            const handleInitialQuestion = async () => {
                if (isNewSession) {
                    const targetAgentId = agentIdForNew || agents.find(a => a.isActive)?.id || agents[0]?.id || '';
                    if (!targetAgentId) return;
                    try {
                        const newSession = await createSession.mutateAsync({ agentId: targetAgentId });
                        navigate(`/dashboard/faculty/${newSession.id}?q=${encodeURIComponent(initialQuestion)}`, { replace: true });
                        return;
                    } catch (err) {
                        console.error('Failed to create initial session:', err);
                        setInput(initialQuestion);
                        return;
                    }
                }
                if (session && session.messages.length === 0) {
                    setSearchParams({}, { replace: true });
                    setTimeout(() => {
                        sendOrchestratedMessage({ message: initialQuestion, lengthPreference });
                    }, 100);
                } else if (!session) {
                    hasAutoSent.current[sessionKey] = false;
                }
            };

            handleInitialQuestion();
        }
    }, [isNewSession, effectiveSessionId, session, searchParams, isSending, isStreaming, sendOrchestratedMessage, lengthPreference, setSearchParams, createSession, navigate, agentIdForNew, agents]);

    // ── Handlers ─────────────────────────────────────────────────────────────

    const toggleSidebar = () => {
        setIsLeftSidebarOpen(prev => {
            const next = !prev;
            localStorage.setItem('faculty-sidebar', String(next));
            return next;
        });
    };

    const handleRename = (id: string, newTitle: string) => {
        if (!newTitle.trim()) { setRenameConfirmId(null); return; }
        renameSession.mutate({ sessionId: id, title: newTitle.trim() });
        setRenameConfirmId(null);
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isSending || isStreaming) return;

        const userMsg = input;
        setInput('');
        userScrolledUp.current = false;
        scrollToBottom(true);

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
            setInput(userMsg);
        }
    };

    const handleExtract = async (type: string) => {
        if (extractingType) return;
        setExtractingType(type);
        try {
            if (type === 'SERMON') {
                const raw = await extractContent({ type: 'SERMON_OUTLINE' });
                const json = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
                const outline: SermonOutline = JSON.parse(json);
                setSermonOutline(outline);
                return;
            }
            const result = await extractContent({ type });
            setExtractedContent({
                title: t(EXTRACTION_TITLE_KEYS[type] || 'extraction.extractedDocument'),
                markdown: result,
            });
            setIsLeftSidebarOpen(false);
            setIsRightSidebarOpen(false);
        } catch (error) {
            console.error('Extraction failed:', error);
            toast.error(t('extraction.extractionFailed'));
        } finally {
            setExtractingType(null);
        }
    };

    const handleGenerateFullSermon = async (approvedOutline: SermonOutline, personalization?: SermonPersonalization): Promise<string> => {
        return await extractContent({ type: 'SERMON', approvedOutline, personalization });
    };

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-50 dark:bg-zinc-950 font-sans">
            {/* Header */}
            <FacultyChatHeader
                isHomeState={isHomeState}
                isNewSession={isNewSession}
                sessionTitle={session?.title}
                sessionAgentId={session?.agentId}
                agentNameForNew={agentNameForNew}
                lengthPreference={lengthPreference}
                isLeftSidebarOpen={isLeftSidebarOpen}
                isRightSidebarOpen={isRightSidebarOpen}
                onBack={() => navigate('/dashboard/faculty')}
                onSetLengthPreference={setLengthPreference}
                onToggleLeftSidebar={toggleSidebar}
                onToggleRightSidebar={() => setIsRightSidebarOpen(prev => !prev)}
            />

            <div className="flex-1 flex overflow-hidden">
                {/* Left sidebar */}
                <FacultySessionSidebar
                    isOpen={isLeftSidebarOpen}
                    sessions={sessions}
                    projects={projects}
                    activeSessionId={effectiveSessionId || undefined}
                    isLoading={isLoadingSessions}
                    renameConfirmId={renameConfirmId}
                    onToggle={toggleSidebar}
                    onNewConversation={() => navigate('/dashboard/faculty/new')}
                    onNewProject={() => setProjectDialog({ mode: 'create' })}
                    onNavigateSession={(id) => navigate(`/dashboard/faculty/${id}`)}
                    onDeleteSession={(id) => setDeleteConfirmId(id)}
                    onRenameSession={(id) => setRenameConfirmId(id)}
                    onSaveRename={handleRename}
                    onCancelRename={() => setRenameConfirmId(null)}
                    onAssignToProject={(sid, pid) => assignToProject.mutate({ sessionId: sid, projectId: pid })}
                    onEditProject={(project) => setProjectDialog({ mode: 'edit', project })}
                    onDeleteProject={(pid) => deleteProjectMutation.mutate(pid)}
                />

                <div className="flex-1 flex overflow-hidden">
                    {/* Main chat area */}
                    <main className={cn("flex flex-col min-w-0 relative transition-all duration-300", extractedContent ? (isZenMode ? "hidden" : "w-1/2 border-r") : "w-full")}>
                        {isHomeState ? (
                            <div className="flex-1 overflow-y-auto">
                                <FacultyHomeContent />
                            </div>
                        ) : isLoadingSession && !isNewSession ? (
                            <div className="flex-1 flex items-center justify-center">
                                <div className="flex flex-col items-center gap-3 text-slate-400">
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                    <p className="text-sm">{t('chat.loadingConversation')}</p>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div ref={chatScrollRef} className="flex-1 overflow-y-auto overflow-x-hidden px-4 md:px-8 py-8 space-y-6 scroll-smooth pb-40">
                                    <div className="max-w-3xl mx-auto space-y-6 w-full">
                                        <FacultyChatMessages
                                            messages={session?.messages || []}
                                            isNewSession={isNewSession}
                                            isStreaming={isStreaming}
                                            isSending={isSending}
                                            isDeleting={isDeleting}
                                            streamingMessage={streamingMessage}
                                            activeAgents={activeAgents}
                                            agentNameForNew={agentNameForNew}
                                            onDeleteMessage={(messageId) => deleteMessage.mutate({ sessionId: effectiveSessionId, messageId })}
                                        />
                                        <div ref={messagesEndRef} />
                                    </div>
                                </div>

                                <FacultyChatInput
                                    input={input}
                                    isSending={isSending}
                                    isStreaming={isStreaming}
                                    isLoading={isLoadingSession}
                                    streamingMessage={streamingMessage}
                                    isHidden={isHomeState}
                                    onInputChange={setInput}
                                    onSubmit={handleSendMessage}
                                />
                            </>
                        )}
                    </main>

                    {/* Editor Panel */}
                    {extractedContent && (
                        <aside className={cn("flex flex-col bg-background shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] z-10 relative border-l transition-all duration-300", isZenMode ? "w-full" : "w-1/2")}>
                            <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/10 h-14 shrink-0">
                                <h3 className="font-semibold text-sm truncate pr-4 text-foreground/80">{extractedContent.title}</h3>
                                <button onClick={() => { setExtractedContent(null); setIsZenMode(false); }} className="p-1.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-hidden bg-background">
                                <FacultyDocumentEditor
                                    markdown={extractedContent.markdown}
                                    onChange={(md) => setExtractedContent(prev => prev ? { ...prev, markdown: md } : null)}
                                    onMicroAction={(actionType, selectedText, context, customPrompt) => processMicroAction({ actionType, selectedText, documentContext: context, customPrompt })}
                                    isProcessing={isProcessingMicroAction}
                                    isZenMode={isZenMode}
                                    onToggleZenMode={() => setIsZenMode(prev => !prev)}
                                />
                            </div>
                        </aside>
                    )}
                </div>

                {/* Right extraction panel */}
                <FacultyExtractionPanel
                    isOpen={isRightSidebarOpen}
                    extractingType={extractingType}
                    messageCount={session?.messages.length || 0}
                    onExtract={handleExtract}
                />
            </div>

            {/* Sermon Outline Preview Modal */}
            <SermonOutlinePreviewModal
                outline={sermonOutline}
                sessionId={effectiveSessionId || undefined}
                onClose={() => setSermonOutline(null)}
                onGenerateFullSermon={handleGenerateFullSermon}
                onSuccess={(sermonId, content, title) => {
                    setExtractedContent({ title, markdown: content });
                    setIsLeftSidebarOpen(false);
                    setIsRightSidebarOpen(false);
                }}
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
                        <AlertDialogTitle>{t('dialogs.deleteSessionTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('dialogs.deleteSessionDescription')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('dialogs.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (deleteConfirmId) {
                                    deleteSessionMutation.mutate(deleteConfirmId);
                                    setDeleteConfirmId(null);
                                }
                            }}
                            className="bg-rose-600 hover:bg-rose-700 text-white"
                        >
                            {t('dialogs.delete')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
