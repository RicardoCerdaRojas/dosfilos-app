import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { guidedSermonService, type ActivateGuidedSermonResult, type SubmitGuidedInsightResult } from '@dosfilos/application';
import type { SocraticTurnResult, AIChatSession, AIChatMessage } from '@dosfilos/domain';

export interface SubmitInsightArgs {
    sessionId: string;
    insight: {
        centralIdea: string;
        observations: string[];
        openQuestion: string;
        pastoralAnecdote: string;
        doxologicalApplication: string;
    };
    renderedInsightText: string;
    affirmationText: string;
}
import { useFirebase } from '@/context/firebase-context';
import { useTranslation } from '@/i18n';

interface UseGuidedSermonResult {
    /** True while a turn / activation is in flight. */
    isProcessing: boolean;
    /** Activate guided mode on `sessionId` with `passage`. */
    activate: (sessionId: string, passage: string) => Promise<ActivateGuidedSermonResult | null>;
    /** Send one pastor message; receive agent reply via the chat session subscription. */
    runTurn: (sessionId: string, pastorMessage: string) => Promise<SocraticTurnResult | null>;
    /** Paso 8 estructurado: persiste el Insight desde el formulario (sin LLM/parse). */
    submitInsight: (args: SubmitInsightArgs) => Promise<SubmitGuidedInsightResult | null>;
    /** Pause the agent on the session (resumable). */
    pause: (sessionId: string) => Promise<void>;
    /** Resume a paused agent session. */
    resume: (sessionId: string) => Promise<void>;
}

/**
 * Phase 2.5 PR B (ADR-028) — Hook for the Faculty Socratic Sermon Agent.
 *
 * Thin React binding: orchestration lives in `GuidedSermonService` (which
 * composes the application use cases). This hook only wires the current
 * user + processing state + toast for errors. Hook output is the agent's
 * RESULT; the chat message stream is owned by the existing Faculty chat
 * subscription — we don't duplicate it.
 */
export function useGuidedSermon(): UseGuidedSermonResult {
    const { user } = useFirebase();
    const { t } = useTranslation('guidedSermon');
    const queryClient = useQueryClient();
    const [isProcessing, setIsProcessing] = useState(false);

    // The guided agent mutates the chat session server-side (welcome message,
    // guidedSermonSession field, per-turn messages + step advance). The Faculty
    // chat reads that session via react-query — NOT a realtime subscription —
    // so every guided op must invalidate it or the UI looks frozen ("nothing
    // happened" → user re-activates → "already active"). Prefix-invalidate hits
    // both the session detail and the sidebar list.
    const refreshSession = useCallback(() => {
        if (!user?.uid) return;
        queryClient.invalidateQueries({ queryKey: ['faculty', 'sessions', user.uid] });
    }, [queryClient, user?.uid]);

    const activate = useCallback(
        async (sessionId: string, passage: string) => {
            if (!user?.uid) return null;
            setIsProcessing(true);
            try {
                const result = await guidedSermonService.activate({
                    userId: user.uid,
                    sessionId,
                    passage,
                });
                refreshSession();
                return result;
            } catch (err) {
                console.error('[useGuidedSermon] activate failed', err);
                toast.error(t('error.activate'));
                return null;
            } finally {
                setIsProcessing(false);
            }
        },
        [user?.uid, t, refreshSession, queryClient],
    );

    const runTurn = useCallback(
        async (sessionId: string, pastorMessage: string) => {
            if (!user?.uid) return null;
            setIsProcessing(true);

            // Optimistically show the pastor's message right away. The Socratic
            // turn runs an LLM call (can take many seconds); without this the
            // message vanishes from the input and nothing shows until the
            // post-turn refetch lands. The refetch replaces this with the
            // server-assigned message; on failure we roll it back.
            const sessionKey = ['faculty', 'sessions', user.uid, sessionId];
            const optimisticId = `optimistic_${Date.now()}`;
            const optimisticMsg: AIChatMessage = {
                id: optimisticId,
                role: 'user',
                content: pastorMessage,
                timestamp: new Date(),
            };
            queryClient.setQueryData<AIChatSession | null>(sessionKey, (prev) =>
                prev ? { ...prev, messages: [...prev.messages, optimisticMsg] } : prev,
            );

            try {
                const result = await guidedSermonService.runTurn({
                    userId: user.uid,
                    sessionId,
                    pastorMessage,
                });
                refreshSession();
                return result;
            } catch (err) {
                console.error('[useGuidedSermon] runTurn failed', err);
                queryClient.setQueryData<AIChatSession | null>(sessionKey, (prev) =>
                    prev ? { ...prev, messages: prev.messages.filter((m) => m.id !== optimisticId) } : prev,
                );
                toast.error(t('error.runTurn'));
                return null;
            } finally {
                setIsProcessing(false);
            }
        },
        [user?.uid, t, refreshSession, queryClient],
    );

    const submitInsight = useCallback(
        async (args: SubmitInsightArgs) => {
            if (!user?.uid) return null;
            setIsProcessing(true);
            const sessionKey = ['faculty', 'sessions', user.uid, args.sessionId];
            const optimisticId = `optimistic_${Date.now()}`;
            queryClient.setQueryData<AIChatSession | null>(sessionKey, (prev) =>
                prev
                    ? {
                          ...prev,
                          messages: [
                              ...prev.messages,
                              { id: optimisticId, role: 'user', content: args.renderedInsightText, timestamp: new Date() } as AIChatMessage,
                          ],
                      }
                    : prev,
            );
            try {
                const result = await guidedSermonService.submitInsight({
                    userId: user.uid,
                    sessionId: args.sessionId,
                    insight: args.insight,
                    renderedInsightText: args.renderedInsightText,
                    affirmationText: args.affirmationText,
                });
                refreshSession();
                return result;
            } catch (err) {
                console.error('[useGuidedSermon] submitInsight failed', err);
                queryClient.setQueryData<AIChatSession | null>(sessionKey, (prev) =>
                    prev ? { ...prev, messages: prev.messages.filter((m) => m.id !== optimisticId) } : prev,
                );
                toast.error(t('error.runTurn'));
                return null;
            } finally {
                setIsProcessing(false);
            }
        },
        [user?.uid, t, refreshSession, queryClient],
    );

    const pause = useCallback(
        async (sessionId: string) => {
            if (!user?.uid) return;
            try {
                await guidedSermonService.pause({ userId: user.uid, sessionId });
                refreshSession();
            } catch (err) {
                console.error('[useGuidedSermon] pause failed', err);
            }
        },
        [user?.uid, refreshSession],
    );

    const resume = useCallback(
        async (sessionId: string) => {
            if (!user?.uid) return;
            try {
                await guidedSermonService.resume({ userId: user.uid, sessionId });
                refreshSession();
            } catch (err) {
                console.error('[useGuidedSermon] resume failed', err);
            }
        },
        [user?.uid, refreshSession],
    );

    return { isProcessing, activate, runTurn, submitInsight, pause, resume };
}
