import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { facultyService, type ApprovedSermonOutline } from '@dosfilos/application';
import { UsageLimitsService } from '@dosfilos/application/src/services/UsageLimitsService';
import { FirebaseUserProfileRepository, FirebasePlanRepository } from '@dosfilos/infrastructure';
import { useFirebase } from '@/context/firebase-context';
import { useAuthorization } from '@/hooks/useAuthorization';
import { AIAgent, SermonPersonalization, ResponseMode, ConcreteResponseMode, DEFAULT_LANGUAGE } from '@dosfilos/domain';
import type {
    SupportedLanguage,
    SourceReference,
    AIChatMessage,
    AIChatSession,
    InlineAttachment,
    MessageAttachmentMeta,
} from '@dosfilos/domain';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

/**
 * Coerces the i18next runtime language code (which may include a country
 * suffix like `en-US` or be missing entirely) into the strict
 * `SupportedLanguage` union the AI engine expects.
 */
function resolveActiveLanguage(raw: string | undefined): SupportedLanguage {
    if (!raw) return DEFAULT_LANGUAGE;
    const base = raw.split('-')[0];
    return base === 'en' ? 'en' : 'es';
}

const quotaService = new UsageLimitsService(
    new FirebaseUserProfileRepository(),
    new FirebasePlanRepository(),
);

/**
 * Thrown when the user has hit their monthly query quota. The mutation `onError`
 * surfaces it as a toast pointing them to /pricing instead of triggering the
 * generic "no se pudo guardar la respuesta" message.
 */
class QuotaExceededError extends Error {
    constructor(public readonly reason: string) {
        super(reason);
        this.name = 'QuotaExceededError';
    }
}

import { useState } from 'react';

export function useFacultyChat(sessionId: string) {
    const { user } = useFirebase();
    const { isAdmin } = useAuthorization();
    const queryClient = useQueryClient();
    const { i18n } = useTranslation();
    const [streamingMessage, setStreamingMessage] = useState<string>('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [activeAgents, setActiveAgents] = useState<AIAgent[]>([]);
    // Last inferred mode — used by UI to show a "Detectado: X" badge below the active response
    const [lastInferredMode, setLastInferredMode] = useState<{ mode: ConcreteResponseMode; wasAuto: boolean } | null>(null);

    const sessionQueryKey = ['faculty', 'sessions', user?.uid, sessionId];
    // Sidebar list lives under a shorter key. Invalidating the prefix below
    // hits both this session's detail query AND the all-sessions list, which
    // is what the sidebar needs to redraw a renamed session (the title is
    // generated server-side after the first exchange).
    const allSessionsQueryKey = ['faculty', 'sessions', user?.uid];

    // Fetch the specific session details (messages)
    const sessionQuery = useQuery({
        queryKey: sessionQueryKey,
        queryFn: async () => {
            if (!user?.uid) throw new Error('User not authenticated');
            // Single-doc read (full transcript) — no longer fetches the whole
            // history just to pick one session.
            return await facultyService.getSession.execute(user.uid, sessionId);
        },
        enabled: !!user?.uid && !!sessionId,
    });

    /**
     * The session cache key this send is writing to.
     *
     * The override covers the new-session-creation race: the mutation
     * started while the page still had `sessionId=''`, but the service
     * call wrote against the freshly created session. Without it the
     * optimistic write lands on the wrong key and the chat looks empty
     * until the background refetch arrives.
     */
    const cacheKeyFor = (targetSessionId?: string) => (targetSessionId
        ? ['faculty', 'sessions', user?.uid, targetSessionId]
        : sessionQueryKey);

    /**
     * Puts the user's message on screen the moment they send it.
     *
     * It used to appear only when the whole exchange was committed —
     * after the model had finished. For the seconds in between, the
     * question was nowhere: the thread showed the previous messages and
     * a spinner, so it read as if the send had failed or the question
     * had been swallowed. A message the user just typed should never
     * take a round-trip to become visible.
     */
    const commitOptimisticUserMessage = (
        userText: string,
        attachmentsMeta?: MessageAttachmentMeta[],
        targetSessionId?: string,
    ): string => {
        const id = `optimistic-user-${Date.now()}`;
        queryClient.setQueryData<AIChatSession | null>(cacheKeyFor(targetSessionId), (prev) => {
            if (!prev) return prev;
            const userMsg: AIChatMessage = {
                id,
                role: 'user',
                content: userText,
                timestamp: new Date(),
                ...(attachmentsMeta && attachmentsMeta.length > 0 && { attachments: attachmentsMeta }),
            };
            return { ...prev, messages: [...prev.messages, userMsg] };
        });
        return id;
    };

    /**
     * Drops the optimistic user message when the send never reached the
     * model, so a failed turn doesn't leave a question sitting in the
     * thread as though it had been asked.
     */
    const rollbackOptimisticUserMessage = (id: string, targetSessionId?: string) => {
        queryClient.setQueryData<AIChatSession | null>(cacheKeyFor(targetSessionId), (prev) => (
            prev ? { ...prev, messages: prev.messages.filter(m => m.id !== id) } : prev
        ));
    };

    /**
     * Pushes the user message + the just-finished model response into the
     * session query cache so the persisted-message list shows the new exchange
     * the instant the streaming bubble disappears. Without this, there's a
     * visible gap where neither the streaming bubble nor the persisted message
     * is on screen — feels like the response disappears and reloads.
     *
     * `optimisticUserMessageId` names the bubble already on screen from
     * `commitOptimisticUserMessage`; it is replaced rather than appended,
     * or the question would show up twice.
     *
     * The IDs we mint here are placeholders. The background `invalidateQueries`
     * call refetches the canonical session from Firestore, which replaces these
     * with server-assigned IDs — but since the content is identical, the user
     * sees no visible change.
     */
    const commitOptimisticExchange = (
        userText: string,
        modelText: string,
        sources: SourceReference[],
        modeUsed: ConcreteResponseMode | undefined,
        modeWasAuto: boolean,
        attachmentsMeta?: MessageAttachmentMeta[],
        targetSessionId?: string,
        optimisticUserMessageId?: string,
    ) => {
        queryClient.setQueryData<AIChatSession | null>(cacheKeyFor(targetSessionId), (prev) => {
            if (!prev) return prev;
            const now = new Date();
            const userMsg: AIChatMessage = {
                id: `optimistic-user-${now.getTime()}`,
                role: 'user',
                content: userText,
                timestamp: now,
                ...(attachmentsMeta && attachmentsMeta.length > 0 && { attachments: attachmentsMeta }),
            };
            const modelMsg: AIChatMessage = {
                id: `optimistic-model-${now.getTime()}`,
                role: 'model',
                content: modelText,
                timestamp: now,
                ...(sources.length > 0 && { sources }),
                ...(modeUsed && { modeUsed, modeWasAuto }),
            };
            const withoutOptimistic = optimisticUserMessageId
                ? prev.messages.filter(m => m.id !== optimisticUserMessageId)
                : prev.messages;
            return { ...prev, messages: [...withoutOptimistic, userMsg, modelMsg], updatedAt: now };
        });
    };

    // Direct message to the session's assigned agent (original behaviour)
    const sendMessageMutation = useMutation({
        mutationFn: async ({ message, lengthPreference, ephemeralContext }: { message: string, lengthPreference?: ResponseMode, ephemeralContext?: string }) => {
            if (!user?.uid) throw new Error('User not authenticated');
            if (!sessionQuery.data) throw new Error('Session not found');

            const quota = await quotaService.canQuery(user.uid);
            if (!quota.allowed) {
                throw new QuotaExceededError(quota.reason ?? 'Quota agotada.');
            }

            setIsStreaming(true);
            setStreamingMessage('');

            const optimisticUserId = commitOptimisticUserMessage(message);

            // Captured during streaming so the optimistic commit can include
            // them — otherwise the bibliography panel would pop in only after
            // the background refetch resolves.
            let capturedSources: SourceReference[] = [];

            try {
                const response = await facultyService.sendMessage.execute(
                    user.uid,
                    sessionId,
                    message,
                    (chunk) => { setStreamingMessage((prev) => prev + chunk); },
                    lengthPreference,
                    (sources) => { capturedSources = sources; },
                    resolveActiveLanguage(i18n.language),
                    isAdmin, // super-admin sees protected-source citations (reveal mask)
                    ephemeralContext, // editor follow-ups: current sermon as transient grounding
                );
                // Inject the new exchange into the cache BEFORE clearing the
                // streaming state so there's no gap on screen. See
                // `commitOptimisticExchange` for the rationale.
                const effectiveMode: ConcreteResponseMode | undefined = lengthPreference === 'auto'
                    ? 'detailed'
                    : (lengthPreference as ConcreteResponseMode | undefined);
                commitOptimisticExchange(
                    message, response, capturedSources, effectiveMode,
                    lengthPreference === 'auto', undefined, undefined, optimisticUserId,
                );
                return response;
            } catch (err) {
                rollbackOptimisticUserMessage(optimisticUserId);
                throw err;
            } finally {
                setIsStreaming(false);
                setStreamingMessage('');
            }
        },
        onSuccess: () => {
            // Background refetch replaces optimistic ids with canonical ones.
            // Content is identical, so this is invisible to the user.
            queryClient.invalidateQueries({ queryKey: allSessionsQueryKey });
        },
        onError: (error) => {
            if (error instanceof QuotaExceededError) {
                toast.error(error.reason, {
                    description: 'Haz upgrade de plan para continuar.',
                    action: { label: 'Ver planes', onClick: () => { window.location.href = '/dashboard/subscription'; } },
                });
                return;
            }
            console.error('[useFacultyChat] Direct message failed:', error);
            toast.error('No se pudo guardar la respuesta. Por favor intenta de nuevo.');
            queryClient.invalidateQueries({ queryKey: allSessionsQueryKey });
        }
    });

    // Orchestrated message — router picks the best specialist automatically
    const sendOrchestratedMessageMutation = useMutation({
        mutationFn: async ({
            message,
            lengthPreference,
            attachments,
            attachmentsMeta,
            sessionIdOverride,
        }: {
            message: string;
            lengthPreference?: ResponseMode;
            /** Inline-encoded files for the model (not persisted). */
            attachments?: InlineAttachment[];
            /** Display metadata for the user bubble (persisted to Firestore). */
            attachmentsMeta?: MessageAttachmentMeta[];
            /**
             * Bypass closure-captured `sessionId` for the new-session
             * race: caller just created the session and needs the send
             * to target the fresh id, even though the page hasn't re-
             * rendered with the new `sessionId` param yet (so
             * `sessionQuery.data` is still `undefined`).
             */
            sessionIdOverride?: string;
        }) => {
            if (!user?.uid) throw new Error('User not authenticated');
            const targetSessionId = sessionIdOverride ?? sessionId;
            // Skip the sessionQuery.data guard when an override is
            // provided — the caller just persisted the session and
            // owns the id directly; the query just hasn't refetched.
            if (!sessionIdOverride && !sessionQuery.data) throw new Error('Session not found');

            const quota = await quotaService.canQuery(user.uid);
            if (!quota.allowed) {
                throw new QuotaExceededError(quota.reason ?? 'Quota agotada.');
            }

            setIsStreaming(true);
            setStreamingMessage('');
            setActiveAgents([]);
            setLastInferredMode(null);

            // On screen before the model is even called.
            const optimisticUserId = commitOptimisticUserMessage(
                message, attachmentsMeta, sessionIdOverride,
            );

            let capturedSources: SourceReference[] = [];
            let capturedMode: ConcreteResponseMode | undefined;
            let capturedWasAuto = false;

            try {
                const { response, effectiveMode } = await facultyService.orchestratedMessage.execute(
                    user.uid,
                    targetSessionId,
                    message,
                    (chunk) => { setStreamingMessage((prev) => prev + chunk); },
                    (agents) => { setActiveAgents(agents); },
                    lengthPreference,
                    (sources) => { capturedSources = sources; },
                    (mode, wasAuto) => {
                        setLastInferredMode({ mode, wasAuto });
                        capturedMode = mode;
                        capturedWasAuto = wasAuto;
                    },
                    resolveActiveLanguage(i18n.language),
                    attachments,
                    attachmentsMeta,
                    isAdmin, // super-admin sees protected-source citations (reveal mask)
                );
                // Inject the user message + the streamed model response into
                // the cache before clearing the streaming state — otherwise
                // there's a perceptible gap between bubble disappearing and
                // refetch returning.
                commitOptimisticExchange(
                    message,
                    response,
                    capturedSources,
                    capturedMode ?? effectiveMode,
                    capturedWasAuto,
                    attachmentsMeta,
                    sessionIdOverride,
                    optimisticUserId,
                );
                // Increment the monthly query counter server-side. Fire-and-forget
                // so it doesn't delay the response rendering.
                void quotaService.incrementQuery();
                return response;
            } catch (err) {
                rollbackOptimisticUserMessage(optimisticUserId, sessionIdOverride);
                throw err;
            } finally {
                setIsStreaming(false);
                setStreamingMessage('');
            }
        },
        onSuccess: () => {
            // Background refetch overwrites optimistic ids with canonical
            // server-assigned ones. Content is the same, so this is invisible
            // to the user.
            queryClient.invalidateQueries({ queryKey: allSessionsQueryKey });
        },
        onError: (error) => {
            if (error instanceof QuotaExceededError) {
                toast.error(error.reason, {
                    description: 'Haz upgrade de plan para continuar.',
                    action: { label: 'Ver planes', onClick: () => { window.location.href = '/dashboard/subscription'; } },
                });
                return;
            }
            console.error('[useFacultyChat] Orchestrated message failed:', error);
            toast.error('No se pudo guardar la respuesta. Por favor intenta de nuevo.');
            queryClient.invalidateQueries({ queryKey: allSessionsQueryKey });
        }
    });

    const deleteMessageMutation = useMutation({
        mutationFn: async (messageId: string) => {
            if (!user?.uid) throw new Error('User not authenticated');
            return await facultyService.deleteMessage.execute(user.uid, sessionId, messageId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: allSessionsQueryKey });
        }
    });

    // Raw extraction — returns the LLM markdown string. Used for preview
    // flows (e.g. SERMON_OUTLINE JSON parsed into the wizard modal) where
    // we do NOT want a persisted Extraction document.
    const extractContentMutation = useMutation({
        mutationFn: async ({ type, approvedOutline, personalization, onChunk }: { type: 'SERMON' | 'SERMON_OUTLINE' | 'BIBLE_STUDY' | 'COUNSELING_TASK' | 'NEWSLETTER' | 'SYSTEMATIC_THEOLOGY_PAPER' | 'BLOG_POST' | 'DEVOTIONAL'; approvedOutline?: ApprovedSermonOutline; personalization?: SermonPersonalization; onChunk?: (chunk: string) => void }) => {
            if (!user?.uid) throw new Error('User not authenticated');
            return await facultyService.extractContent.execute(
                user.uid, sessionId, type, approvedOutline, personalization, onChunk,
                resolveActiveLanguage(i18n.language),
            );
        }
    });

    // Persisted extraction — generates AND writes a top-level Extraction
    // doc. Use for any artifact the user should be able to return to,
    // edit, or pin. Returns the saved Extraction so the caller can
    // surface a toast with "Ver" action that opens it in the editor.
    const generateAndSaveExtractionMutation = useMutation({
        mutationFn: async ({ type, approvedOutline, personalization, onChunk, fallbackTitle }: { type: 'SERMON' | 'BIBLE_STUDY' | 'COUNSELING_TASK' | 'NEWSLETTER' | 'SYSTEMATIC_THEOLOGY_PAPER' | 'BLOG_POST' | 'DEVOTIONAL'; approvedOutline?: ApprovedSermonOutline; personalization?: SermonPersonalization; onChunk?: (chunk: string) => void; fallbackTitle: string }) => {
            if (!user?.uid) throw new Error('User not authenticated');
            return await facultyService.generateAndSaveExtraction.execute({
                userId: user.uid,
                sessionId,
                type,
                approvedOutline,
                personalization,
                onChunk,
                language: resolveActiveLanguage(i18n.language),
                fallbackTitle,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['faculty', 'extractions'] });
        }
    });

    const processMicroActionMutation = useMutation({
        mutationFn: async ({ selectedText, actionType, documentContext, customPrompt, onChunk }: { selectedText: string; actionType: 'REWRITE' | 'EXPAND' | 'SUMMARIZE' | 'BULLET_POINTS' | 'QUOTE_SEARCH' | 'MAKE_ACADEMIC' | 'MAKE_PASTORAL' | 'CUSTOM'; documentContext?: string; customPrompt?: string; onChunk?: (chunk: string) => void }) => {
            if (!user?.uid) throw new Error('User not authenticated');
            return await facultyService.processMicroAction.execute({
                userId: user.uid,
                sessionId,
                selectedText,
                actionType,
                documentContext,
                customPrompt,
                onChunk,
                language: resolveActiveLanguage(i18n.language),
            });
        }
    });

    return {
        session: sessionQuery.data,
        isLoadingSession: sessionQuery.isLoading,
        // Direct agent mode
        sendMessage: sendMessageMutation.mutateAsync,
        isSending: sendMessageMutation.isPending,
        // Orchestrated mode
        sendOrchestratedMessage: sendOrchestratedMessageMutation.mutateAsync,
        isOrchestrating: sendOrchestratedMessageMutation.isPending,
        activeAgents,
        lastInferredMode,
        // Shared
        streamingMessage,
        isStreaming,
        extractContent: extractContentMutation.mutateAsync,
        isExtracting: extractContentMutation.isPending,
        generateAndSaveExtraction: generateAndSaveExtractionMutation.mutateAsync,
        isGeneratingExtraction: generateAndSaveExtractionMutation.isPending,
        processMicroAction: processMicroActionMutation.mutateAsync,
        isProcessingMicroAction: processMicroActionMutation.isPending,
        deleteMessage: deleteMessageMutation.mutateAsync,
        isDeleting: deleteMessageMutation.isPending
    };
}
