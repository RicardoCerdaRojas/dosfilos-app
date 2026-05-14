import { useEffect, useRef } from 'react';
import { type NavigateFunction, type SetURLSearchParams } from 'react-router-dom';
import { takePendingFacultyInput } from '../utils/pendingFacultyInput';
import { type ResponseMode, type AIAgent, type AIChatSession } from '@dosfilos/domain';

interface SendOrchestratedMessageInput {
    message: string;
    lengthPreference: ResponseMode;
    attachments?: Array<{ mimeType: string; data: string }>;
    attachmentsMeta?: Array<{ filename: string; mimeType: string; sizeBytes: number }>;
}

interface CreateSessionInput {
    agentId: string;
    projectId?: string;
    context?: { paperId?: string; seriesId?: string; pericopeId?: string };
}

interface UseAutoSendQuestionParams {
    isNewSession: boolean;
    effectiveSessionId: string;
    session: AIChatSession | undefined | null;
    isSending: boolean;
    isStreaming: boolean;
    agentIdForNew: string;
    agents: AIAgent[];
    projectIdForNew: string | undefined;
    contextForNew: { paperId?: string; seriesId?: string; pericopeId?: string } | undefined;
    lengthPreference: ResponseMode;
    searchParams: URLSearchParams;
    setSearchParams: SetURLSearchParams;
    navigate: NavigateFunction;
    createSession: { mutateAsync: (input: CreateSessionInput) => Promise<{ id: string }> };
    sendOrchestratedMessage: (input: SendOrchestratedMessageInput) => Promise<void>;
    setInput: (value: string) => void;
}

/**
 * Drives the two flavors of "auto-send the first question" the chat
 * supports when arriving at /new:
 *
 *   1. `?q=...` — text question stashed in the URL by the directory
 *      landing CTA. Replayed once the session exists.
 *   2. `sessionStorage` pending input — same flow but carrying a
 *      base64 attachment that wouldn't fit in the URL.
 *
 * Both paths converge on creating the session, navigating to the
 * canonical id, and firing `sendOrchestratedMessage`. Hoisted out of
 * `chat.tsx` because the effect bookkeeping (per-route key, retry
 * when agents are still loading, auto-send only on empty session)
 * obscured the page-level component.
 */
export function useAutoSendQuestion(params: UseAutoSendQuestionParams) {
    const {
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
    } = params;

    // Per `${route}::${question}` key so a second visit to /new with a
    // different question is not blocked by an earlier success on the
    // same route — React Router reuses the component instance between
    // /faculty/new and /faculty/{id}.
    const hasAutoSent = useRef<Record<string, boolean>>({});

    // Bridge for the directory landing's image-paste flow: the question
    // + base64 attachment was stashed in sessionStorage (URL params
    // can't carry binary). Drain once on new-session mount, replay
    // create-session-and-send-with-attachment.
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
    }, [isNewSession, agentIdForNew, agents, projectIdForNew, contextForNew, createSession, navigate, sendOrchestratedMessage, lengthPreference, setInput]);

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isNewSession, effectiveSessionId, session, searchParams, isSending, isStreaming, sendOrchestratedMessage, lengthPreference, setSearchParams, createSession, navigate, agentIdForNew, agents]);
}
