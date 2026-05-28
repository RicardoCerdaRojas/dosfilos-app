import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { AIChatSession } from '@dosfilos/domain';
import { useGuidedSermon } from '@/hooks/useGuidedSermon';
import { useStudyDepthGate } from '@/hooks/usePastoralFidelityGate';

interface Params {
    session: AIChatSession | null | undefined;
    effectiveSessionId: string;
    /** Cleared after a turn is dispatched so the input is responsive. */
    setInput: (v: string) => void;
}

interface Result {
    /** True when the study_depth flag is on for the current user. */
    isFlagEnabled: boolean;
    /** True when the current session has guided-sermon mode ACTIVE. */
    isGuidedActive: boolean;
    /** True when the session has any guided-sermon state (active/paused/completed). */
    hasGuidedSession: boolean;
    /** True while the agent is processing a turn or activating. */
    isProcessing: boolean;
    /** Whether the activation prompt is currently shown inline. */
    activationPromptOpen: boolean;
    openActivationPrompt: () => void;
    closeActivationPrompt: () => void;
    /** Activate guided mode with a given passage; closes the prompt on success. */
    activate: (passage: string) => Promise<void>;
    /** Pause/resume the agent on the current session. */
    pause: () => Promise<void>;
    resume: () => Promise<void>;
    /**
     * Submit handler suitable for a chat form. When guided mode is active,
     * routes the message through the Socratic agent's `runTurn`. Otherwise
     * returns `false` so the caller falls back to the normal send pipeline.
     */
    trySocraticSubmit: (message: string) => Promise<boolean>;
}

/**
 * Phase 2.5 PR B (ADR-028) — Faculty chat integration for the Socratic
 * Sermon Agent. Kept out of `chat.tsx` so the page component stays under
 * the file-size compliance limit + the integration logic is testable in
 * isolation.
 */
export function useGuidedSermonIntegration({
    session,
    effectiveSessionId,
    setInput,
}: Params): Result {
    const { enabled: isFlagEnabled } = useStudyDepthGate();
    const guidedSermon = useGuidedSermon();
    const [activationPromptOpen, setActivationPromptOpen] = useState(false);
    const [searchParams, setSearchParams] = useSearchParams();
    const autoOpenedRef = useRef(false);

    // Phase 2.5 PR B reroute: `?guided=1` from the Faculty home "Bosquejo
    // de Sermón" chip auto-opens the activation prompt on landing. Strip
    // the param once consumed so reloads don't re-trigger.
    useEffect(() => {
        if (autoOpenedRef.current) return;
        if (!isFlagEnabled) return;
        if (searchParams.get('guided') !== '1') return;
        if (!effectiveSessionId) return;
        if (session?.guidedSermonSession) return;
        autoOpenedRef.current = true;
        setActivationPromptOpen(true);
        const next = new URLSearchParams(searchParams);
        next.delete('guided');
        setSearchParams(next, { replace: true });
    }, [isFlagEnabled, searchParams, effectiveSessionId, session?.guidedSermonSession, setSearchParams]);

    const guidedSermonSession = session?.guidedSermonSession;
    const hasGuidedSession = Boolean(guidedSermonSession);
    const isGuidedActive = guidedSermonSession?.status === 'active';

    const openActivationPrompt = useCallback(() => setActivationPromptOpen(true), []);
    const closeActivationPrompt = useCallback(() => setActivationPromptOpen(false), []);

    const activate = useCallback(
        async (passage: string) => {
            if (!effectiveSessionId) return;
            const result = await guidedSermon.activate(effectiveSessionId, passage);
            if (result) setActivationPromptOpen(false);
        },
        [effectiveSessionId, guidedSermon],
    );

    const pause = useCallback(async () => {
        if (!effectiveSessionId) return;
        await guidedSermon.pause(effectiveSessionId);
    }, [effectiveSessionId, guidedSermon]);

    const resume = useCallback(async () => {
        if (!effectiveSessionId) return;
        await guidedSermon.resume(effectiveSessionId);
    }, [effectiveSessionId, guidedSermon]);

    const trySocraticSubmit = useCallback(
        async (message: string): Promise<boolean> => {
            if (!isGuidedActive || !effectiveSessionId) return false;
            const trimmed = message.trim();
            if (!trimmed) return true; // claim "handled" so caller skips fallback
            setInput('');
            await guidedSermon.runTurn(effectiveSessionId, trimmed);
            return true;
        },
        [effectiveSessionId, guidedSermon, isGuidedActive, setInput],
    );

    return {
        isFlagEnabled,
        isGuidedActive,
        hasGuidedSession,
        isProcessing: guidedSermon.isProcessing,
        activationPromptOpen,
        openActivationPrompt,
        closeActivationPrompt,
        activate,
        pause,
        resume,
        trySocraticSubmit,
    };
}
