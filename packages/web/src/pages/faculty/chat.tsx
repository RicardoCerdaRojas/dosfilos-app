import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';
import { track } from '@/lib/analytics/track';
import { facultyService } from '@dosfilos/application';
import { useFirebase } from '@/context/firebase-context';
import { useFacultyChat, useFacultySessions, useFacultyAgents, useSessionExtractions, useExtractionMutations } from '../../hooks/faculty';
import { useFacultyProjects } from '@/hooks/faculty/useFacultyProjects';
import { SermonOutlinePreviewModal, type SermonOutline } from '@/components/faculty/SermonOutlinePreviewModal';
import { FacultySessionSidebar } from '@/components/faculty/FacultySessionSidebar';
import { FacultyExtractionPanel } from '@/components/faculty/FacultyExtractionPanel';
import { FacultyChatMessages } from '@/components/faculty/FacultyChatMessages';
import { FacultyChatInput } from '@/components/faculty/FacultyChatInput';
import { FacultyDocumentEditor } from '@/components/faculty/FacultyDocumentEditor';
import { EmailExtractionDialog } from '@/components/faculty/EmailExtractionDialog';
import { PublishToWordpressDialog } from '@/components/faculty/PublishToWordpressDialog';
import { ProjectEditDialog } from './ProjectEditDialog';
import { type AIProject, type Extraction, type ExtractionType, type ResponseMode } from '@dosfilos/domain';
import { FacultyHomeContent } from './index';
import { copyMessageToClipboard } from './utils/copyMessageToClipboard';
import { useAutoscrollChat } from './hooks/useAutoscrollChat';
import { useAutoSendQuestion } from './hooks/useAutoSendQuestion';
import { useExtractionListHandlers } from './hooks/useExtractionListHandlers';
import { useExtractionAction } from './hooks/useExtractionAction';
import { useDocumentEditor } from './hooks/useDocumentEditor';
import { useSendMessage } from './hooks/useSendMessage';
import { useDeleteMessage } from './hooks/useDeleteMessage';
import { FacultyConfirmDialogs } from './components/FacultyConfirmDialogs';

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
    const { user } = useFirebase();
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
        generateAndSaveExtraction,
        deleteMessage,
        processMicroAction,
        isProcessingMicroAction,
    } = useFacultyChat(effectiveSessionId);

    // Persisted extractions for this session — drives the "Generados" tab.
    const { extractions, error: extractionsError, refetch: refetchExtractions } = useSessionExtractions(effectiveSessionId);
    const { updateMarkdown: updateExtractionMarkdown, rename: renameExtraction, addToProject: addExtractionToProject, removeFromProject: removeExtractionFromProject, deleteExtraction } = useExtractionMutations();

    const isSending = isOrchestrating;

    // ── Agent context for new sessions ───────────────────────────────────────
    const agentNameForNew = searchParams.get('agentName') ?? t('header.orchestratorFallbackName');
    const agentIdForNew = searchParams.get('agent') ?? '';
    /**
     * When the user lands here from a project workspace (link
     * `/dashboard/faculty?projectId=...`), we propagate that id into the new
     * session so the orchestrator scopes RAG to the project's `sourceIds` and
     * injects `contextNote` into every message.
     */
    const projectIdForNew = searchParams.get('projectId') ?? undefined;

    /**
     * Phase 4 enrichment refs. When the user lands here from a paper /
     * series / pericope CTA (e.g. `?paperId=abc&seriesId=xyz&pericopeId=123`),
     * we propagate those ids into the new session so the orchestrator
     * hydrates them on every turn and injects a compact context block
     * into the user message. Hidden behind the new-session branch only —
     * existing sessions already carry their context in Firestore.
     */
    const contextForNew = (() => {
        const paperId = searchParams.get('paperId') ?? undefined;
        const seriesId = searchParams.get('seriesId') ?? undefined;
        const pericopeId = searchParams.get('pericopeId') ?? undefined;
        if (!paperId && !seriesId && !pericopeId) return undefined;
        return { paperId, seriesId, pericopeId };
    })();

    // ── Local state ──────────────────────────────────────────────────────────
    const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(
        () => localStorage.getItem('faculty-sidebar') !== 'false'
    );
    const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(
        () => localStorage.getItem('faculty-extraction-panel') !== 'false'
    );
    useEffect(() => {
        localStorage.setItem('faculty-extraction-panel', String(isRightSidebarOpen));
    }, [isRightSidebarOpen]);
    const [lengthPreference, setLengthPreference] = useState<ResponseMode>('auto');
    const [sermonOutline, setSermonOutline] = useState<SermonOutline | null>(null);
    const [emailDialogExtraction, setEmailDialogExtraction] = useState<Extraction | null>(null);
    const [wpDialogExtraction, setWpDialogExtraction] = useState<Extraction | null>(null);
    const [projectDialog, setProjectDialog] = useState<{ mode: 'create' } | { mode: 'edit'; project: AIProject } | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [renameConfirmId, setRenameConfirmId] = useState<string | null>(null);

    // Unified document editor state. Either an in-memory sermon (the
    // sermons module owns its own collection — we just render the
    // markdown returned by the wizard modal) or a persisted Extraction.
    // Mutually exclusive sources; `closeDocument()` resets both. The
    // editor also autosaves extraction edits via debounced mutation.
    const {
        documentSource,
        documentExtractionId,
        documentTitle,
        documentMarkdown,
        isDocumentOpen,
        isZenMode,
        setDocumentTitle,
        setDocumentMarkdown,
        setIsZenMode,
        openExtractionInEditor,
        openSermonPreview,
        closeDocument,
    } = useDocumentEditor({
        extractions,
        updateExtractionMarkdown,
        onOpen: () => {
            // Reclaim horizontal space: both side rails collapse when a
            // document opens. User can re-expand from the header toggles.
            setIsLeftSidebarOpen(false);
            setIsRightSidebarOpen(false);
        },
    });

    // ── Scroll management ────────────────────────────────────────────────────
    const { messagesEndRef, chatScrollRef, scrollToBottom } = useAutoscrollChat([
        streamingMessage,
        session?.messages,
    ]);

    // ── Send + delete message hooks ──────────────────────────────────────────
    const {
        input,
        setInput,
        pendingAttachment,
        setPendingAttachment,
        handleSendMessage,
    } = useSendMessage({
        isNewSession,
        isSending,
        isStreaming,
        agentIdForNew,
        agents,
        projectIdForNew,
        contextForNew,
        lengthPreference,
        scrollToBottom,
        navigate,
        createSession,
        sendOrchestratedMessage,
    });

    const {
        deleteMessageConfirmId,
        deletingMessageId,
        requestDeleteMessage,
        cancelDelete: cancelDeleteMessage,
        handleConfirmDeleteMessage,
    } = useDeleteMessage({ deleteMessage });

    // ── Auto-send initial question from ?q= or sessionStorage ────────────────
    useAutoSendQuestion({
        isNewSession,
        effectiveSessionId,
        session,
        isSending,
        isStreaming,
        agentIdForNew,
        agents,
        projectIdForNew,
        contextForNew,
        lengthPreference,
        searchParams,
        setSearchParams,
        navigate,
        createSession,
        sendOrchestratedMessage,
        setInput,
    });

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

    const { extractingType, handleExtract } = useExtractionAction({
        effectiveSessionId,
        session,
        isDocumentOpen,
        extractContent,
        generateAndSaveExtraction,
        setSermonOutline,
        openExtractionInEditor,
    });

    // ── Extraction list handlers (panel "Generados" tab) ─────────────────────
    const {
        handleRenameExtraction,
        handleAddExtractionToProject,
        handleRemoveExtractionFromProject,
        handleDeleteExtraction,
        handleJumpToOrigin,
    } = useExtractionListHandlers({
        documentExtractionId,
        effectiveSessionId,
        navigate,
        setDocumentTitle,
        closeDocument,
        renameExtraction,
        addExtractionToProject,
        removeExtractionFromProject,
        deleteExtraction,
    });

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-muted/30 font-sans">
            {/*
             * No global page header. Rail toggles live as edge-tabs
             * on each rail (FacultySessionSidebar / FacultyExtractionPanel),
             * the mode selector is colocated with the input it
             * affects, and the session context (back arrow + title)
             * is rendered as a thin sticky strip inside the message
             * area below — only when there's an actual session.
             */}

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
                    onNewConversation={() => navigate(
                        projectIdForNew
                            ? `/dashboard/faculty/new?projectId=${projectIdForNew}`
                            : '/dashboard/faculty/new'
                    )}
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
                    {/* Two-panel layout when an extracted document is open.
                        Resizable horizontally so the user can give more
                        space to the chat (skim reference messages while
                        editing the doc) or to the editor (full-document
                        focus). Persisted via `autoSaveId` so the split
                        survives reloads. */}
                    <PanelGroup
                        orientation="horizontal"
                        id="faculty-chat-doc-split"
                        className="w-full h-full"
                    >
                        {/* Main chat area */}
                        {!(isDocumentOpen && isZenMode) && (
                            <Panel defaultSize={isDocumentOpen ? 50 : 100} minSize={25} id="chat">
                                <main className="flex flex-col h-full min-w-0 relative">
                                    {isHomeState ? (
                                        <div className="flex-1 overflow-y-auto">
                                            <FacultyHomeContent />
                                        </div>
                                    ) : isLoadingSession && !isNewSession ? (
                                        <div className="flex-1 flex items-center justify-center">
                                            <div className="flex flex-col items-center gap-3 text-muted-foreground">
                                                <Loader2 className="w-6 h-6 animate-spin" />
                                                <p className="text-sm">{t('chat.loadingConversation')}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {/*
                                             * Compact session strip — replaces the
                                             * old global page header in session view.
                                             * Sticky at the top of the scroll area
                                             * so the user always has back-to-home
                                             * affordance + session title without a
                                             * full chrome bar.
                                             */}
                                            <div className="sticky top-0 z-10 flex items-center gap-2 px-4 md:px-8 py-2 bg-background/80 backdrop-blur border-b border-border">
                                                <button
                                                    onClick={() => navigate('/dashboard/faculty')}
                                                    className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                                                    title={t('header.backToHome')}
                                                    aria-label={t('header.backToHome')}
                                                >
                                                    <ArrowLeft className="w-4 h-4" />
                                                </button>
                                                <h1 className="text-sm font-semibold leading-none truncate">
                                                    {isNewSession ? agentNameForNew : (session?.title || t('header.sessionActive'))}
                                                </h1>
                                                {isNewSession && (
                                                    <span className="text-[11px] text-muted-foreground ml-1 hidden sm:inline">
                                                        · {t('header.newSession')}
                                                    </span>
                                                )}
                                            </div>
                                            <div ref={chatScrollRef} className="flex-1 overflow-y-auto overflow-x-hidden px-4 md:px-8 py-8 space-y-6 scroll-smooth pb-40">
                                                <div className="max-w-3xl mx-auto space-y-6 w-full">
                                                    <FacultyChatMessages
                                                        messages={session?.messages || []}
                                                        isNewSession={isNewSession}
                                                        isStreaming={isStreaming}
                                                        isSending={isSending}
                                                        deletingMessageId={deletingMessageId}
                                                        streamingMessage={streamingMessage}
                                                        activeAgents={activeAgents}
                                                        agentNameForNew={agentNameForNew}
                                                        onRequestDeleteMessage={requestDeleteMessage}
                                                        onCopyMessage={(content, messageId) => copyMessageToClipboard(content, messageId, t)}
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
                                                attachment={pendingAttachment}
                                                onAttach={setPendingAttachment}
                                                lengthPreference={lengthPreference}
                                                onSetLengthPreference={setLengthPreference}
                                            />
                                        </>
                                    )}
                                </main>
                            </Panel>
                        )}

                        {/* Resize handle — visible only when both panels
                            are shown (document open, not in zen mode). */}
                        {isDocumentOpen && !isZenMode && (
                            <PanelResizeHandle className="w-1 bg-border hover:bg-primary/40 active:bg-primary/60 transition-colors cursor-col-resize" />
                        )}

                        {/* Document editor panel. Single source of truth
                            for both ephemeral sermons (from the wizard
                            modal) and persisted extractions (from the
                            "Generados" tab). Title + close + view toggle
                            + copy buttons live in the editor toolbar. */}
                        {isDocumentOpen && (
                            <Panel
                                defaultSize={isZenMode ? 100 : 50}
                                minSize={30}
                                id="document"
                            >
                                <aside className="flex flex-col h-full bg-background shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] z-10 relative border-l">
                                    <div className="flex-1 overflow-hidden bg-background">
                                        <FacultyDocumentEditor
                                            // Remount on artifact swap so MDXEditor
                                            // reads the fresh markdown. Without this,
                                            // selecting a second artifact from the
                                            // Generados list keeps the editor showing
                                            // the previously-loaded body. The
                                            // 'sermon-preview' branch covers the
                                            // ephemeral sermon flow from the wizard.
                                            key={documentExtractionId ?? 'sermon-preview'}
                                            title={documentTitle}
                                            onClose={closeDocument}
                                            markdown={documentMarkdown}
                                            onChange={setDocumentMarkdown}
                                            onMicroAction={(actionType, selectedText, context, customPrompt) => processMicroAction({ actionType, selectedText, documentContext: context, customPrompt })}
                                            isProcessing={isProcessingMicroAction}
                                            isZenMode={isZenMode}
                                            onToggleZenMode={() => setIsZenMode(prev => !prev)}
                                        />
                                    </div>
                                </aside>
                            </Panel>
                        )}
                    </PanelGroup>
                </div>

                {/* Right extraction panel */}
                <FacultyExtractionPanel
                    isOpen={isRightSidebarOpen}
                    onToggle={() => setIsRightSidebarOpen(prev => !prev)}
                    extractingType={extractingType}
                    messageCount={session?.messages.length || 0}
                    onExtract={handleExtract}
                    extractions={extractions}
                    selectedExtractionId={documentExtractionId}
                    onSelectExtraction={(extraction) => {
                        track('faculty_artifact_opened_from_library', {
                            type: extraction.type,
                            ageHours: Math.round((Date.now() - extraction.createdAt.getTime()) / 3_600_000),
                            sameSession: extraction.sessionId === effectiveSessionId,
                        });
                        openExtractionInEditor(extraction);
                    }}
                    onDeleteExtraction={handleDeleteExtraction}
                    onRenameExtraction={handleRenameExtraction}
                    onAddExtractionToProject={handleAddExtractionToProject}
                    onRemoveExtractionFromProject={handleRemoveExtractionFromProject}
                    projects={projects}
                    onJumpToOrigin={handleJumpToOrigin}
                    onOpenExternal={(extraction) => {
                        if (extraction.externalRef?.collection === 'sermons') {
                            navigate(`/dashboard/sermons/${extraction.externalRef.id}`);
                        }
                    }}
                    onShareByEmail={setEmailDialogExtraction}
                    onPublishToWordpress={setWpDialogExtraction}
                    extractionsError={extractionsError}
                    onRefreshExtractions={() => refetchExtractions()}
                />
            </div>

            {/* Sermon Outline Preview Modal */}
            <SermonOutlinePreviewModal
                outline={sermonOutline}
                sessionId={effectiveSessionId || undefined}
                onClose={() => setSermonOutline(null)}
                onGenerateFullSermon={(outline, personalization) =>
                    extractContent({ type: 'SERMON', approvedOutline: outline, personalization })
                }
                onSuccess={(sermonId, content, title) => {
                    // Sermon doc is canonical (sermons/{id}); persist a
                    // companion Extraction so the artifact also surfaces
                    // in the user's resource library with a back-link
                    // to the sermons module via externalRef.
                    if (user?.uid && effectiveSessionId) {
                        const messageIds = session?.messages?.map(m => m.id) ?? [];
                        facultyService.saveSermonExtraction.execute({
                            userId: user.uid,
                            sessionId: effectiveSessionId,
                            sermonId,
                            title,
                            markdown: content,
                            derivedFromMessageIds: messageIds,
                        }).catch(err => {
                            console.error('[chat] saveSermonExtraction failed', err);
                        });
                    }
                    // Inline preview keeps working for visual continuity —
                    // the user sees the sermon body in the doc panel
                    // immediately, even before the Extraction listener
                    // refreshes the Generados tab. The hook's `onOpen`
                    // collapses both rails.
                    openSermonPreview(title, content);
                }}
            />

            {/* Project create/edit dialog */}
            {projectDialog && (
                <ProjectEditDialog
                    project={'project' in projectDialog ? (projectDialog as { mode: 'edit'; project: AIProject }).project : undefined}
                    onClose={() => setProjectDialog(null)}
                />
            )}

            {/* Email-share dialog */}
            <EmailExtractionDialog
                extraction={emailDialogExtraction}
                onClose={() => setEmailDialogExtraction(null)}
            />

            {/* WordPress publish dialog */}
            <PublishToWordpressDialog
                extraction={wpDialogExtraction}
                onClose={() => setWpDialogExtraction(null)}
            />

            <FacultyConfirmDialogs
                deleteSessionId={deleteConfirmId}
                onCloseDeleteSession={() => setDeleteConfirmId(null)}
                onConfirmDeleteSession={() => {
                    if (deleteConfirmId) {
                        deleteSessionMutation.mutate(deleteConfirmId);
                        setDeleteConfirmId(null);
                    }
                }}
                deleteMessageId={deleteMessageConfirmId}
                onCloseDeleteMessage={cancelDeleteMessage}
                onConfirmDeleteMessage={handleConfirmDeleteMessage}
            />
        </div>
    );
}
