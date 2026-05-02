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
import { type AIProject, type SermonPersonalization, type ResponseMode } from '@dosfilos/domain';
import { FacultyHomeContent } from './index';

// ── Extraction type-to-key mapping ───────────────────────────────────────────

const EXTRACTION_TITLE_KEYS: Record<string, string> = {
    SERMON: 'extraction.sermonOutline',
    BIBLE_STUDY: 'extraction.bibleStudy',
    COUNSELING_TASK: 'extraction.counselingTask',
    NEWSLETTER: 'extraction.newsletter',
    SYSTEMATIC_THEOLOGY_PAPER: 'extraction.theologyPaper',
};

/**
 * Reads a File as base64 (no `data:` URI prefix) and returns the inline
 * payload Gemini expects plus the small metadata we persist alongside the
 * user message so the bubble can show a "📎 photo.jpg · 2.4 MB" badge
 * after reload. The binary itself is not stored.
 */
async function prepareAttachmentForSend(file: File): Promise<{
    inline: { mimeType: string; data: string };
    meta: { filename: string; mimeType: string; sizeBytes: number };
}> {
    const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            // FileReader returns "data:image/png;base64,iVBOR..." — strip
            // the URI scheme so we hand Gemini just the base64 payload.
            const result = String(reader.result ?? '');
            const comma = result.indexOf(',');
            resolve(comma >= 0 ? result.slice(comma + 1) : result);
        };
        reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
        reader.readAsDataURL(file);
    });
    return {
        inline: { mimeType: file.type || 'application/octet-stream', data },
        meta: { filename: file.name, mimeType: file.type || 'application/octet-stream', sizeBytes: file.size },
    };
}

/**
 * Injects inline CSS into the rendered prose HTML so it survives a paste
 * into Word, Google Docs, or Notion. Those editors strip `class`
 * attributes but preserve inline `style="..."`, so tables would otherwise
 * render as borderless grids. We walk the parsed fragment with the
 * browser's DOMParser, tag the structural elements we care about, and
 * serialize back. Non-table content (headings, paragraphs, lists) keeps
 * its semantics — Word and Docs handle those out of the box, so we add
 * only enough styling to look intentional.
 */
function injectInlineStylesForCopy(html: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');

    const tableStyle = 'border-collapse: collapse; width: 100%; margin: 12px 0; font-family: inherit;';
    const headerCellStyle = 'border: 1px solid #999; padding: 8px 10px; background: #f3f3f3; text-align: left; vertical-align: top; font-weight: 600;';
    const bodyCellStyle = 'border: 1px solid #999; padding: 8px 10px; vertical-align: top;';
    const blockquoteStyle = 'margin: 12px 0; padding: 8px 14px; border-left: 4px solid #94a3b8; background: #f8fafc; color: #334155;';

    doc.querySelectorAll('table').forEach((el) => el.setAttribute('style', tableStyle));
    doc.querySelectorAll('th').forEach((el) => el.setAttribute('style', headerCellStyle));
    doc.querySelectorAll('td').forEach((el) => el.setAttribute('style', bodyCellStyle));
    doc.querySelectorAll('blockquote').forEach((el) => el.setAttribute('style', blockquoteStyle));

    return doc.body.firstElementChild?.innerHTML ?? html;
}

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
    const [input, setInput] = useState('');
    const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(
        () => localStorage.getItem('faculty-sidebar') !== 'false'
    );
    const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
    const [lengthPreference, setLengthPreference] = useState<ResponseMode>('auto');
    const [extractedContent, setExtractedContent] = useState<{ title: string; markdown: string } | null>(null);
    const [sermonOutline, setSermonOutline] = useState<SermonOutline | null>(null);
    const [extractingType, setExtractingType] = useState<string | null>(null);
    const [projectDialog, setProjectDialog] = useState<{ mode: 'create' } | { mode: 'edit'; project: AIProject } | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [renameConfirmId, setRenameConfirmId] = useState<string | null>(null);
    const [deleteMessageConfirmId, setDeleteMessageConfirmId] = useState<string | null>(null);
    const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
    const [isZenMode, setIsZenMode] = useState(false);
    const [pendingAttachment, setPendingAttachment] = useState<File | null>(null);

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
    // The key combines route + question so a second visit to `/new?q=...` with
    // a DIFFERENT question is not blocked by an earlier success on the same
    // route. React Router reuses this component instance between `/faculty/new`
    // and `/faculty/{id}`, so a per-route key alone (the previous design)
    // misfires after the first auto-send because the ref persists.
    const hasAutoSent = useRef<Record<string, boolean>>({});

    useEffect(() => {
        const initialQuestion = searchParams.get('q');
        if (!initialQuestion) return;
        const sessionKey = `${effectiveSessionId || 'new'}::${initialQuestion}`;

        if (!hasAutoSent.current[sessionKey] && !isSending && !isStreaming) {
            hasAutoSent.current[sessionKey] = true;

            const handleInitialQuestion = async () => {
                if (isNewSession) {
                    const targetAgentId = agentIdForNew || agents.find(a => a.isActive)?.id || agents[0]?.id || '';
                    if (!targetAgentId) {
                        // Agents not loaded yet — let useEffect re-fire when they are.
                        hasAutoSent.current[sessionKey] = false;
                        return;
                    }
                    try {
                        const newSession = await createSession.mutateAsync({
                            agentId: targetAgentId,
                            projectId: projectIdForNew,
                            context: contextForNew,
                        });
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

    /**
     * Copies a chat message to the clipboard in BOTH formats:
     *   - text/html: the rendered markdown with inline styles injected so
     *     tables, headings, and blockquotes look correct after paste in
     *     Word, Google Docs, Notion, etc. Those editors strip `class`
     *     attributes but keep inline `style="..."`.
     *   - text/plain: the raw markdown source, as a fallback for plain-text
     *     editors and "paste as plain text".
     *
     * Falls back to writeText when the modern API is unavailable (older
     * browsers or non-secure contexts).
     */
    const handleCopyMessage = async (content: string, messageId: string) => {
        try {
            const node = document.querySelector(`[data-message-id="${messageId}"] .prose`);
            const rawHtml = node?.innerHTML?.trim();

            if (rawHtml && typeof window !== 'undefined' && typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
                const styled = injectInlineStylesForCopy(rawHtml);
                await navigator.clipboard.write([
                    new ClipboardItem({
                        'text/html': new Blob([styled], { type: 'text/html' }),
                        'text/plain': new Blob([content], { type: 'text/plain' }),
                    }),
                ]);
            } else {
                await navigator.clipboard.writeText(content);
            }
            toast.success(t('dialogs.copied'));
        } catch (err) {
            console.warn('[FacultyChat] clipboard write failed:', err);
            try {
                await navigator.clipboard.writeText(content);
                toast.success(t('dialogs.copied'));
            } catch {
                toast.error(t('dialogs.copyFailed'));
            }
        }
    };

    const handleConfirmDeleteMessage = async () => {
        if (!deleteMessageConfirmId) return;
        const id = deleteMessageConfirmId;
        setDeleteMessageConfirmId(null);
        setDeletingMessageId(id);
        try {
            await deleteMessage(id);
        } finally {
            setDeletingMessageId(null);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        // Allow image-only sends — the model is multimodal so a question
        // can live entirely in the picture (e.g. "what does this say?").
        const hasAttachment = !!pendingAttachment;
        if ((!input.trim() && !hasAttachment) || isSending || isStreaming) return;

        const userMsg = input;
        const stagedAttachment = pendingAttachment;
        setInput('');
        setPendingAttachment(null);
        userScrolledUp.current = false;
        scrollToBottom(true);

        // Convert the file once up front so both the new-session path
        // (which waits on createSession before sending) and the existing
        // session path can reuse the same payload.
        let inlineAndMeta: {
            inline?: { mimeType: string; data: string };
            meta?: { filename: string; mimeType: string; sizeBytes: number };
        } = {};
        if (stagedAttachment) {
            try {
                const prepared = await prepareAttachmentForSend(stagedAttachment);
                inlineAndMeta = { inline: prepared.inline, meta: prepared.meta };
                console.log('[FacultyChat] attachment ready:', {
                    name: prepared.meta.filename,
                    mime: prepared.meta.mimeType,
                    bytes: prepared.meta.sizeBytes,
                });
            } catch (err) {
                console.error('[FacultyChat] attachment encoding failed:', err);
                toast.error(t('chat.attachment.tooLarge'));
                setInput(userMsg);
                setPendingAttachment(stagedAttachment);
                return;
            }
        }

        if (isNewSession) {
            const targetAgentId = agentIdForNew || agents.find(a => a.isActive)?.id || agents[0]?.id || '';
            if (!targetAgentId) {
                setInput(userMsg);
                if (stagedAttachment) setPendingAttachment(stagedAttachment);
                return;
            }
            try {
                const newSession = await createSession.mutateAsync({
                    agentId: targetAgentId,
                    projectId: projectIdForNew,
                    context: contextForNew,
                });
                // The auto-send path via `?q=` can't carry an attachment, so
                // when there's a file we send directly here instead, then
                // navigate to the canonical session URL afterwards.
                if (inlineAndMeta.inline) {
                    navigate(`/dashboard/faculty/${newSession.id}`, { replace: true });
                    await sendOrchestratedMessage({
                        message: userMsg,
                        lengthPreference,
                        attachments: [inlineAndMeta.inline],
                        ...(inlineAndMeta.meta && { attachmentsMeta: [inlineAndMeta.meta] }),
                    });
                } else {
                    navigate(`/dashboard/faculty/${newSession.id}?q=${encodeURIComponent(userMsg)}`, { replace: true });
                }
            } catch (err) {
                console.error('Failed to create session:', err);
                setInput(userMsg);
                if (stagedAttachment) setPendingAttachment(stagedAttachment);
            }
            return;
        }

        try {
            await sendOrchestratedMessage({
                message: userMsg,
                lengthPreference,
                ...(inlineAndMeta.inline && { attachments: [inlineAndMeta.inline] }),
                ...(inlineAndMeta.meta && { attachmentsMeta: [inlineAndMeta.meta] }),
            });
        } catch (error) {
            console.error('Failed to send message:', error);
            setInput(userMsg);
            if (stagedAttachment) setPendingAttachment(stagedAttachment);
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
                                            deletingMessageId={deletingMessageId}
                                            streamingMessage={streamingMessage}
                                            activeAgents={activeAgents}
                                            agentNameForNew={agentNameForNew}
                                            onRequestDeleteMessage={(messageId) => setDeleteMessageConfirmId(messageId)}
                                            onCopyMessage={handleCopyMessage}
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

            {/* Delete Message Confirmation */}
            <AlertDialog
                open={!!deleteMessageConfirmId}
                onOpenChange={(open) => !open && setDeleteMessageConfirmId(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('dialogs.deleteMessageTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('dialogs.deleteMessageDescription')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('dialogs.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmDeleteMessage}
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
