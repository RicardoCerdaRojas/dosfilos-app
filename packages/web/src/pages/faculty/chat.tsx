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
import { Loader2 } from 'lucide-react';
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';
import { useFacultyChat, useFacultySessions, useFacultyAgents, useSessionExtractions, useExtractionMutations } from '../../hooks/faculty';
import { useFacultyProjects } from '@/hooks/faculty/useFacultyProjects';
import { SermonOutlinePreviewModal, type SermonOutline } from '@/components/faculty/SermonOutlinePreviewModal';
import { FacultyChatHeader } from '@/components/faculty/FacultyChatHeader';
import { FacultySessionSidebar } from '@/components/faculty/FacultySessionSidebar';
import { FacultyExtractionPanel } from '@/components/faculty/FacultyExtractionPanel';
import { FacultyChatMessages } from '@/components/faculty/FacultyChatMessages';
import { FacultyChatInput } from '@/components/faculty/FacultyChatInput';
import { FacultyDocumentEditor } from '@/components/faculty/FacultyDocumentEditor';
import { ProjectEditDialog } from './ProjectEditDialog';
import { type AIProject, type Extraction, type ExtractionType, type SermonPersonalization, type ResponseMode } from '@dosfilos/domain';
import { FacultyHomeContent } from './index';
import { takePendingFacultyInput } from './utils/pendingFacultyInput';

// ── Extraction type-to-key mapping ───────────────────────────────────────────

const EXTRACTION_TITLE_KEYS: Record<string, string> = {
    SERMON: 'extraction.sermonOutline',
    BIBLE_STUDY: 'extraction.bibleStudy',
    COUNSELING_TASK: 'extraction.counselingTask',
    NEWSLETTER: 'extraction.newsletter',
    SYSTEMATIC_THEOLOGY_PAPER: 'extraction.theologyPaper',
    BLOG_POST: 'extraction.blogPost',
    DEVOTIONAL: 'extraction.devotional',
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
        generateAndSaveExtraction,
        deleteMessage,
        isDeleting,
        processMicroAction,
        isProcessingMicroAction,
    } = useFacultyChat(effectiveSessionId);

    // Persisted extractions for this session — drives the "Generados" tab.
    const { extractions } = useSessionExtractions(effectiveSessionId);
    const { updateMarkdown: updateExtractionMarkdown, rename: renameExtraction, pinToProject: pinExtraction, deleteExtraction } = useExtractionMutations();

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
    const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(
        () => localStorage.getItem('faculty-extraction-panel') !== 'false'
    );
    useEffect(() => {
        localStorage.setItem('faculty-extraction-panel', String(isRightSidebarOpen));
    }, [isRightSidebarOpen]);
    const [lengthPreference, setLengthPreference] = useState<ResponseMode>('auto');
    // Unified document editor state. Either an in-memory sermon (sermon
    // module owns its own collection — we just render the markdown
    // returned by the wizard modal) or a persisted Extraction. Mutually
    // exclusive sources; `closeDocument()` resets both.
    const [documentSource, setDocumentSource] = useState<'sermon' | 'extraction' | null>(null);
    const [documentExtractionId, setDocumentExtractionId] = useState<string | null>(null);
    const [documentTitle, setDocumentTitle] = useState<string>('');
    const [documentMarkdown, setDocumentMarkdown] = useState<string>('');
    const isDocumentOpen = documentSource !== null;
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

    // Bridge: when the user pasted/uploaded an image on the directory
    // landing page, the question + base64 attachment was stashed in
    // sessionStorage (URL params can't carry binary). Drain it once on
    // new-session mount, replay create-session-and-send-with-attachment.
    const pendingHandled = useRef(false);
    useEffect(() => {
        if (pendingHandled.current) return;
        if (!isNewSession) return;
        const pending = takePendingFacultyInput();
        if (!pending || !pending.attachment) return;
        pendingHandled.current = true;
        const targetAgentId = agentIdForNew || agents.find(a => a.isActive)?.id || agents[0]?.id || '';
        if (!targetAgentId) {
            // Agents not loaded yet — re-stage and let next render retry.
            pendingHandled.current = false;
            return;
        }
        (async () => {
            try {
                const newSession = await createSession.mutateAsync({
                    agentId: targetAgentId,
                    projectId: projectIdForNew,
                    context: contextForNew,
                });
                navigate(`/dashboard/faculty/${newSession.id}`, { replace: true });
                await sendOrchestratedMessage({
                    message: pending.question,
                    lengthPreference,
                    attachments: [{
                        mimeType: pending.attachment!.mimeType,
                        data: pending.attachment!.base64,
                    }],
                    attachmentsMeta: [{
                        filename: pending.attachment!.filename,
                        mimeType: pending.attachment!.mimeType,
                        sizeBytes: pending.attachment!.sizeBytes,
                    }],
                });
            } catch (err) {
                console.error('[FacultyChat] failed to replay pending attachment:', err);
                pendingHandled.current = false;
                setInput(pending.question);
            }
        })();
    }, [isNewSession, agentIdForNew, agents, projectIdForNew, contextForNew, createSession, navigate, sendOrchestratedMessage, lengthPreference]);

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

    const openExtractionInEditor = (extraction: Extraction) => {
        setDocumentSource('extraction');
        setDocumentExtractionId(extraction.id);
        setDocumentTitle(extraction.title);
        setDocumentMarkdown(extraction.markdown);
        setIsLeftSidebarOpen(false);
    };

    const closeDocument = () => {
        setDocumentSource(null);
        setDocumentExtractionId(null);
        setDocumentTitle('');
        setDocumentMarkdown('');
        setIsZenMode(false);
    };

    const handleExtract = async (type: ExtractionType) => {
        if (extractingType) return;
        setExtractingType(type);
        try {
            // SERMON has a richer flow (wizard modal + dedicated sermons
            // collection). The preview SERMON_OUTLINE JSON is NOT
            // persisted — only the final approved sermon is, via the
            // modal's onSuccess path which calls generateAndSaveExtraction.
            if (type === 'SERMON') {
                const raw = await extractContent({ type: 'SERMON_OUTLINE' });
                const json = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
                const outline: SermonOutline = JSON.parse(json);
                setSermonOutline(outline);
                return;
            }
            const fallbackTitle = t(EXTRACTION_TITLE_KEYS[type] || 'extraction.extractedDocument');
            const extraction = await generateAndSaveExtraction({ type, fallbackTitle });
            // Queue UX: don't auto-open if a document is already in the
            // editor. Surface a toast with "Ver" so the user keeps their
            // current work but can discover the new artifact.
            if (isDocumentOpen) {
                toast.success(
                    t('extraction.toast.generated', { title: extraction.title }),
                    {
                        action: {
                            label: t('extraction.toast.view'),
                            onClick: () => openExtractionInEditor(extraction),
                        },
                    },
                );
            } else {
                openExtractionInEditor(extraction);
            }
        } catch (error) {
            console.error('Extraction failed:', error);
            toast.error(t('extraction.extractionFailed'));
        } finally {
            setExtractingType(null);
        }
    };

    const handleGenerateFullSermon = async (approvedOutline: SermonOutline, personalization?: SermonPersonalization): Promise<string> => {
        // The modal expects the markdown back so it can render the
        // sermon preview before calling its onSuccess hook (which is
        // where we persist the Extraction with the sermonId externalRef).
        return await extractContent({ type: 'SERMON', approvedOutline, personalization });
    };

    // Debounced autosave for in-editor edits on a persisted Extraction.
    // The editor calls onChange on every keystroke; we batch saves to
    // Firestore every 1.5s of idle to avoid hammering the write quota.
    useEffect(() => {
        if (documentSource !== 'extraction' || !documentExtractionId) return;
        const current = extractions.find(e => e.id === documentExtractionId);
        if (!current || current.markdown === documentMarkdown) return;
        const handle = setTimeout(() => {
            updateExtractionMarkdown.mutate({
                extractionId: documentExtractionId,
                markdown: documentMarkdown,
            });
        }, 1500);
        return () => clearTimeout(handle);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [documentMarkdown, documentSource, documentExtractionId]);

    // ── Extraction list handlers (panel "Generados" tab) ─────────────────────

    const handleRenameExtraction = (extraction: Extraction) => {
        const next = window.prompt(t('extractionsList.actions.rename'), extraction.title);
        if (!next || next.trim() === extraction.title) return;
        renameExtraction.mutate({ extractionId: extraction.id, title: next.trim() });
        if (documentExtractionId === extraction.id) setDocumentTitle(next.trim());
    };

    const handlePinExtraction = (extraction: Extraction) => {
        // First-cut: toggle pin without a picker UI. When projects are
        // available the panel can grow a sub-menu. For now, unpin if
        // pinned, otherwise pin to the session's current project (if any).
        if (extraction.projectId) {
            pinExtraction.mutate({ extractionId: extraction.id, projectId: null });
            toast.success(t('extractionsList.toast.unpinned'));
        } else if (session?.projectId) {
            pinExtraction.mutate({ extractionId: extraction.id, projectId: session.projectId });
            toast.success(t('extractionsList.toast.pinned'));
        } else {
            toast.info(t('extractionsList.toast.noProject'));
        }
    };

    const handleDeleteExtraction = (extraction: Extraction) => {
        if (!window.confirm(t('extractionsList.confirmDelete'))) return;
        deleteExtraction.mutate(extraction.id);
        if (documentExtractionId === extraction.id) closeDocument();
    };

    const handleJumpToOrigin = (extraction: Extraction) => {
        if (!extraction.sessionId) return;
        const messageHash = extraction.derivedFromMessageIds.length > 0
            ? `#origin=${extraction.derivedFromMessageIds.slice(-3).join(',')}`
            : '';
        if (extraction.sessionId === effectiveSessionId) {
            // Same session — scroll behavior is handled by a hash effect
            // in FacultyChatMessages that watches `#origin=...`.
            window.location.hash = messageHash.slice(1);
        } else {
            navigate(`/dashboard/faculty/${extraction.sessionId}${messageHash}`);
        }
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
                    extractingType={extractingType}
                    messageCount={session?.messages.length || 0}
                    onExtract={handleExtract}
                    extractions={extractions}
                    selectedExtractionId={documentExtractionId}
                    onSelectExtraction={openExtractionInEditor}
                    onDeleteExtraction={handleDeleteExtraction}
                    onRenameExtraction={handleRenameExtraction}
                    onPinExtraction={handlePinExtraction}
                    onJumpToOrigin={handleJumpToOrigin}
                />
            </div>

            {/* Sermon Outline Preview Modal */}
            <SermonOutlinePreviewModal
                outline={sermonOutline}
                sessionId={effectiveSessionId || undefined}
                onClose={() => setSermonOutline(null)}
                onGenerateFullSermon={handleGenerateFullSermon}
                onSuccess={(sermonId, content, title) => {
                    // Ephemeral sermon preview — owned by the sermons
                    // collection, NOT persisted as an Extraction (avoid
                    // double source-of-truth). Renders in the same doc
                    // panel as extractions for visual continuity.
                    setDocumentSource('sermon');
                    setDocumentExtractionId(null);
                    setDocumentTitle(title);
                    setDocumentMarkdown(content);
                    setIsLeftSidebarOpen(false);
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
