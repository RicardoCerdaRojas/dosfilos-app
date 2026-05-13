import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { facultyService, type ApprovedSermonOutline } from '@dosfilos/application';
import { UsageLimitsService } from '@dosfilos/application/src/services/UsageLimitsService';
import { FirebaseUserProfileRepository, FirebasePlanRepository } from '@dosfilos/infrastructure';
import { useFirebase } from '@/context/firebase-context';
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
import { getFunctions, httpsCallable } from 'firebase/functions';
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

/**
 * Fire-and-forget call to increment the user's monthly query counter.
 * Errors are logged but never surface to the user — counter drift is preferable
 * to blocking the chat on a usage-tracking glitch.
 */
async function incrementQueryCounter(): Promise<void> {
    try {
        const fn = httpsCallable(getFunctions(), 'incrementUsage');
        await fn({ kind: 'query' });
    } catch (err) {
        console.warn('[useFacultyChat] Failed to increment query counter:', err);
    }
}

import { useState } from 'react';

export function useFacultyChat(sessionId: string) {
    const { user } = useFirebase();
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
            const sessions = await facultyService.getHistory.execute(user.uid);
            return sessions.find(s => s.id === sessionId) || null;
        },
        enabled: !!user?.uid && !!sessionId,
    });

    /**
     * Pushes the user message + the just-finished model response into the
     * session query cache so the persisted-message list shows the new exchange
     * the instant the streaming bubble disappears. Without this, there's a
     * visible gap where neither the streaming bubble nor the persisted message
     * is on screen — feels like the response disappears and reloads.
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
    ) => {
        queryClient.setQueryData<AIChatSession | null>(sessionQueryKey, (prev) => {
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
            return { ...prev, messages: [...prev.messages, userMsg, modelMsg], updatedAt: now };
        });
    };

    // Direct message to the session's assigned agent (original behaviour)
    const sendMessageMutation = useMutation({
        mutationFn: async ({ message, lengthPreference }: { message: string, lengthPreference?: ResponseMode }) => {
            if (!user?.uid) throw new Error('User not authenticated');
            if (!sessionQuery.data) throw new Error('Session not found');

            const quota = await quotaService.canQuery(user.uid);
            if (!quota.allowed) {
                throw new QuotaExceededError(quota.reason ?? 'Quota agotada.');
            }

            setIsStreaming(true);
            setStreamingMessage('');

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
                );
                // Inject the new exchange into the cache BEFORE clearing the
                // streaming state so there's no gap on screen. See
                // `commitOptimisticExchange` for the rationale.
                const effectiveMode: ConcreteResponseMode | undefined = lengthPreference === 'auto'
                    ? 'detailed'
                    : (lengthPreference as ConcreteResponseMode | undefined);
                commitOptimisticExchange(message, response, capturedSources, effectiveMode, lengthPreference === 'auto');
                return response;
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
        }: {
            message: string;
            lengthPreference?: ResponseMode;
            /** Inline-encoded files for the model (not persisted). */
            attachments?: InlineAttachment[];
            /** Display metadata for the user bubble (persisted to Firestore). */
            attachmentsMeta?: MessageAttachmentMeta[];
        }) => {
            if (!user?.uid) throw new Error('User not authenticated');
            if (!sessionQuery.data) throw new Error('Session not found');

            const quota = await quotaService.canQuery(user.uid);
            if (!quota.allowed) {
                throw new QuotaExceededError(quota.reason ?? 'Quota agotada.');
            }

            setIsStreaming(true);
            setStreamingMessage('');
            setActiveAgents([]);
            setLastInferredMode(null);

            let capturedSources: SourceReference[] = [];
            let capturedMode: ConcreteResponseMode | undefined;
            let capturedWasAuto = false;

            try {
                const { response, effectiveMode } = await facultyService.orchestratedMessage.execute(
                    user.uid,
                    sessionId,
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
                );
                // Increment the monthly query counter server-side. Fire-and-forget
                // so it doesn't delay the response rendering.
                void incrementQueryCounter();
                return response;
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

    const extractContentMutation = useMutation({
        mutationFn: async ({ type, approvedOutline, personalization, onChunk }: { type: 'SERMON' | 'SERMON_OUTLINE' | 'BIBLE_STUDY' | 'COUNSELING_TASK' | 'NEWSLETTER' | 'SYSTEMATIC_THEOLOGY_PAPER' | 'BLOG_POST' | 'DEVOTIONAL'; approvedOutline?: ApprovedSermonOutline; personalization?: SermonPersonalization; onChunk?: (chunk: string) => void }) => {
            if (!user?.uid) throw new Error('User not authenticated');
            return await facultyService.extractContent.execute(
                user.uid, sessionId, type, approvedOutline, personalization, onChunk,
                resolveActiveLanguage(i18n.language),
            );
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
        processMicroAction: processMicroActionMutation.mutateAsync,
        isProcessingMicroAction: processMicroActionMutation.isPending,
        deleteMessage: deleteMessageMutation.mutateAsync,
        isDeleting: deleteMessageMutation.isPending
    };
}
