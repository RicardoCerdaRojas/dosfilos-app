import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { guidedSermonService, type ActivateGuidedSermonResult } from '@dosfilos/application';
import type { SocraticTurnResult } from '@dosfilos/domain';
import { useFirebase } from '@/context/firebase-context';
import { useTranslation } from '@/i18n';

interface UseGuidedSermonResult {
    /** True while a turn / activation is in flight. */
    isProcessing: boolean;
    /** Activate guided mode on `sessionId` with `passage`. */
    activate: (sessionId: string, passage: string) => Promise<ActivateGuidedSermonResult | null>;
    /** Send one pastor message; receive agent reply via the chat session subscription. */
    runTurn: (sessionId: string, pastorMessage: string) => Promise<SocraticTurnResult | null>;
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
    const [isProcessing, setIsProcessing] = useState(false);

    const activate = useCallback(
        async (sessionId: string, passage: string) => {
            if (!user?.uid) return null;
            setIsProcessing(true);
            try {
                return await guidedSermonService.activate({
                    userId: user.uid,
                    sessionId,
                    passage,
                });
            } catch (err) {
                console.error('[useGuidedSermon] activate failed', err);
                toast.error(t('error.activate'));
                return null;
            } finally {
                setIsProcessing(false);
            }
        },
        [user?.uid, t],
    );

    const runTurn = useCallback(
        async (sessionId: string, pastorMessage: string) => {
            if (!user?.uid) return null;
            setIsProcessing(true);
            try {
                return await guidedSermonService.runTurn({
                    userId: user.uid,
                    sessionId,
                    pastorMessage,
                });
            } catch (err) {
                console.error('[useGuidedSermon] runTurn failed', err);
                toast.error(t('error.runTurn'));
                return null;
            } finally {
                setIsProcessing(false);
            }
        },
        [user?.uid, t],
    );

    const pause = useCallback(
        async (sessionId: string) => {
            if (!user?.uid) return;
            try {
                await guidedSermonService.pause({ userId: user.uid, sessionId });
            } catch (err) {
                console.error('[useGuidedSermon] pause failed', err);
            }
        },
        [user?.uid],
    );

    const resume = useCallback(
        async (sessionId: string) => {
            if (!user?.uid) return;
            try {
                await guidedSermonService.resume({ userId: user.uid, sessionId });
            } catch (err) {
                console.error('[useGuidedSermon] resume failed', err);
            }
        },
        [user?.uid],
    );

    return { isProcessing, activate, runTurn, pause, resume };
}
