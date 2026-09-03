import { useEffect, useMemo, useState } from 'react';
import { GraduationCap, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
    buildPaperStudyContext,
    formatPassageReference,
    type ExegeticalPaper,
    type ResponseMode,
    type SupportedLanguage,
} from '@dosfilos/domain';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { useTranslation } from '@/i18n';
import { useFacultySessions } from '@/hooks/faculty/useFacultySessions';
import { useFacultyAgents } from '@/hooks/faculty/useFacultyAgents';
import { useFacultyChat } from '@/hooks/faculty/useFacultyChat';
import { FacultyChatMessages } from '@/components/faculty/FacultyChatMessages';
import { FacultyChatInput } from '@/components/faculty/FacultyChatInput';

/**
 * Slide-in chat panel scoped to a single `ExegeticalPaper`.
 *
 * Replaces the previous "navigate to /dashboard/faculty/new" flow,
 * which lost the user's place in the paper. The drawer keeps the
 * student inside the paper page while still giving them a fully-
 * functional Faculty conversation thread.
 *
 * Session strategy: one persistent thread per paper. On open we
 * search the user's session list for `context.paperId === paper.id`
 * and reuse the most recent match; otherwise we create a fresh
 * session with `context: { paperId }`. The orchestrator hydrates that
 * id server-side into the paper's identity, its citable sources and
 * the verse analyses the student accepted, so the tutor can be asked
 * why a translation was chosen and answer from the paper's own
 * reasoning rather than guessing.
 *
 * The header states which verses made it into that context. The
 * hydration is bounded (see `buildPaperStudyContext`), and a student
 * who cannot see what the tutor was given has no way to read its
 * silences.
 *
 * v1 trade-offs (intentional):
 *   - File attachments are NOT supported here. The `prepareAttachment
 *     ForSend` helper lives inline in the full Faculty page. Power
 *     users who need attachments can still go to the full page —
 *     this drawer is for ad-hoc text questions while editing.
 *   - Length preference defaults to 'auto'; the input's own selector
 *     changes it.
 *   - Message delete is disabled in the drawer (no destructive
 *     actions in a quick side panel).
 */
export interface PaperFacultyDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    paper: ExegeticalPaper;
}

export function PaperFacultyDrawer({ open, onOpenChange, paper }: PaperFacultyDrawerProps) {
    const { t, i18n } = useTranslation('exegesis');
    const activeLanguage: SupportedLanguage = i18n.language?.split('-')[0] === 'en' ? 'en' : 'es';
    const passageDisplay = formatPassageReference(paper.passage, activeLanguage);

    const { sessions, createSession } = useFacultySessions();
    const { data: agents = [] } = useFacultyAgents();

    // Same pure builder the orchestrator runs server-side, so the
    // header reports the context the tutor actually receives instead
    // of a second guess at it that could drift.
    const study = useMemo(
        () => buildPaperStudyContext(paper, { language: activeLanguage }),
        [paper, activeLanguage],
    );

    // Resolved sessionId for THIS open cycle. Resets on close so a
    // re-open picks the freshest session (e.g. user opened the full
    // Faculty page in another tab and started a different thread).
    const [resolvedSessionId, setResolvedSessionId] = useState<string | null>(null);
    const [creatingSession, setCreatingSession] = useState(false);
    // Sessions the list still offers but that no longer exist. Deleting
    // a conversation elsewhere leaves its id in this cached list, the
    // drawer reuses it, the transcript loads as null, and every send
    // fails with "Session not found" — a dead panel with no way out
    // from the paper. Remembering the dead ids lets the resolver skip
    // them and open a fresh thread instead.
    const [missingSessionIds, setMissingSessionIds] = useState<string[]>([]);

    // Most-recent session linked to this paper. Memoized to avoid
    // rerunning the filter+sort on every render.
    const existingSessionForPaper = useMemo(() => {
        const matches = sessions.filter(
            s => s.context?.paperId === paper.id && !missingSessionIds.includes(s.id),
        );
        if (matches.length === 0) return null;
        return matches.slice().sort(
            (a, b) => (b.updatedAt?.getTime?.() ?? 0) - (a.updatedAt?.getTime?.() ?? 0),
        )[0];
    }, [sessions, paper.id, missingSessionIds]);

    // Resolve sessionId when the drawer opens. Uses the existing
    // session when one is found; creates one with `context: { paperId }`
    // otherwise. Waits for `agents` to load before creating because we
    // need a default agent id.
    useEffect(() => {
        if (!open || resolvedSessionId || creatingSession) return;
        if (existingSessionForPaper) {
            setResolvedSessionId(existingSessionForPaper.id);
            return;
        }
        const targetAgentId = agents.find(a => a.isActive)?.id || agents[0]?.id;
        if (!targetAgentId) return;
        setCreatingSession(true);
        createSession.mutateAsync({
            agentId: targetAgentId,
            context: { paperId: paper.id },
        })
            .then(session => setResolvedSessionId(session.id))
            .catch(err => {
                console.error('[exegesis] open faculty drawer: createSession failed:', err);
                toast.error(t('detail.askFaculty.errors.createFailed'));
                onOpenChange(false);
            })
            .finally(() => setCreatingSession(false));
    }, [
        open,
        resolvedSessionId,
        creatingSession,
        existingSessionForPaper,
        agents,
        paper.id,
        createSession,
        onOpenChange,
        t,
    ]);

    useEffect(() => {
        if (!open) setResolvedSessionId(null);
    }, [open]);

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="!max-w-none w-full sm:!max-w-2xl p-0 flex flex-col gap-0"
            >
                <SheetHeader className="px-6 py-4 border-b border-border space-y-0.5">
                    <SheetTitle className="inline-flex items-center gap-2 text-base">
                        <GraduationCap className="h-4 w-4 text-success shrink-0" />
                        {t('detail.askFaculty.drawerTitle')}
                    </SheetTitle>
                    <SheetDescription className="text-xs">
                        {paper.title?.trim() || passageDisplay}
                        {paper.title?.trim() && (
                            <span className="text-muted-foreground"> · {passageDisplay}</span>
                        )}
                    </SheetDescription>
                    <p className="text-[11px] text-muted-foreground pt-0.5">
                        {study.includedVerses.length === 0
                            ? t('detail.askFaculty.analysisPending')
                            : study.omittedVerses.length > 0
                                ? t('detail.askFaculty.analysisPartial', {
                                    verses: study.includedVerses.join(', '),
                                    omitted: study.omittedVerses.join(', '),
                                })
                                : t('detail.askFaculty.analysisLoaded', {
                                    verses: study.includedVerses.join(', '),
                                })}
                    </p>
                </SheetHeader>

                {resolvedSessionId ? (
                    <DrawerChatBody
                        sessionId={resolvedSessionId}
                        onSessionMissing={() => {
                            setMissingSessionIds(prev =>
                                prev.includes(resolvedSessionId) ? prev : [...prev, resolvedSessionId]);
                            setResolvedSessionId(null);
                        }}
                    />
                ) : (
                    <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t('detail.askFaculty.preparing')}
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}

// ── Body (only mounted once a session id is resolved) ──────────────

function DrawerChatBody({
    sessionId,
    onSessionMissing,
}: {
    sessionId: string;
    /** The transcript came back empty — this session is gone. */
    onSessionMissing: () => void;
}) {
    const { t } = useTranslation('exegesis');
    const chat = useFacultyChat(sessionId);

    // A resolved id whose transcript loads as null is a session that no
    // longer exists. Tell the parent so it opens a new one rather than
    // leaving the student typing into a thread that cannot receive.
    useEffect(() => {
        if (!chat.isLoadingSession && chat.session === null) onSessionMissing();
    }, [chat.isLoadingSession, chat.session, onSessionMissing]);
    const [input, setInput] = useState('');
    // Length preference starts at 'auto' and the input's own selector
    // changes it.
    //
    // It used to be a fixed const with no setter, from when
    // `FacultyChatInput` had no mode selector. The input later grew
    // one and made both props required; the drawer kept passing
    // neither, so the selector rendered with `value === undefined`,
    // looked up its icon on a missing entry, and threw — taking the
    // whole panel down the moment it opened. The compiler had been
    // reporting it the whole time, inside a baseline of known errors
    // that nobody reads line by line.
    const [lengthPreference, setLengthPreference] = useState<ResponseMode>('auto');

    const messages = chat.session?.messages ?? [];
    const hasMessages = messages.length > 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const text = input.trim();
        if (!text) return;
        setInput('');
        try {
            await chat.sendOrchestratedMessage({
                message: text,
                lengthPreference,
            });
        } catch (err) {
            console.error('[exegesis] drawer send failed:', err);
            toast.error(t('detail.askFaculty.errors.sendFailed'));
            // Restore input so the user doesn't lose what they typed.
            setInput(text);
        }
    };

    const handleCopy = async (content: string) => {
        try {
            await navigator.clipboard.writeText(content);
            toast.success(t('detail.askFaculty.copied'));
        } catch {
            // Clipboard may be blocked (HTTP, permissions). Silent —
            // not worth a toast for a copy failure.
        }
    };

    return (
        <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto px-4 py-3">
                <FacultyChatMessages
                    messages={messages}
                    isNewSession={!hasMessages}
                    isStreaming={chat.isStreaming}
                    isSending={chat.isOrchestrating}
                    deletingMessageId={null}
                    streamingMessage={chat.streamingMessage}
                    activeAgents={chat.activeAgents}
                    agentNameForNew={t('detail.askFaculty.agentName')}
                    onRequestDeleteMessage={() => { /* delete disabled in drawer */ }}
                    onCopyMessage={handleCopy}
                />
            </div>
            <div className="border-t border-border bg-background">
                <FacultyChatInput
                    input={input}
                    isSending={chat.isOrchestrating}
                    isStreaming={chat.isStreaming}
                    isLoading={chat.isLoadingSession}
                    streamingMessage={chat.streamingMessage}
                    isHidden={false}
                    onInputChange={setInput}
                    onSubmit={handleSubmit}
                    attachment={null}
                    onAttach={() => { /* attachments disabled in drawer */ }}
                    lengthPreference={lengthPreference}
                    onSetLengthPreference={setLengthPreference}
                />
            </div>
        </div>
    );
}
