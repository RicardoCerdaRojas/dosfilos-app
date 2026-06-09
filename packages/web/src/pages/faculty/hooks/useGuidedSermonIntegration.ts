import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams, type NavigateFunction } from 'react-router-dom';
import type { AIChatSession, AIAgent } from '@dosfilos/domain';
import { pastoralSeedService, sermonService } from '@dosfilos/application';
import { useGuidedSermon } from '@/hooks/useGuidedSermon';
import { useStudyDepthGate } from '@/hooks/usePastoralFidelityGate';

interface Params {
    session: AIChatSession | null | undefined;
    effectiveSessionId: string;
    /** Cleared after a turn is dispatched so the input is responsive. */
    setInput: (v: string) => void;
    /** Needed to activate guided mode straight from a brand-new (/new) session. */
    createSession: { mutateAsync: (input: { agentId: string }) => Promise<{ id: string }> };
    agentIdForNew: string;
    agents: AIAgent[];
    navigate: NavigateFunction;
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
    /** Materializes the sermon doc + opens the wizard at homiletics (completed study). */
    openCompletedWizard: () => Promise<void>;
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
    createSession,
    agentIdForNew,
    agents,
    navigate,
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
            // Already active → just close the prompt. Prevents the
            // "Guided sermon is already active" throw when the pastor
            // re-submits because the first activation hadn't visibly landed.
            if (isGuidedActive) {
                setActivationPromptOpen(false);
                return;
            }

            // On a brand-new (/new) session there is no session id yet — create
            // one first, then activate against it. Without this the activation
            // silently no-ops on /new (the modal button does nothing).
            let sessionId = effectiveSessionId;
            let agentIdForCreate = '';
            if (!sessionId) {
                agentIdForCreate = agentIdForNew || agents.find((a) => a.isActive)?.id || agents[0]?.id || '';
                if (!agentIdForCreate) return; // agents not loaded yet — let the pastor retry
            }

            // Close the modal up-front so it doesn't flash again on the landing
            // page during the async create + activate round-trip.
            setActivationPromptOpen(false);

            if (!sessionId) {
                const created = await createSession.mutateAsync({ agentId: agentIdForCreate });
                sessionId = created.id;
                navigate(`/dashboard/faculty/${sessionId}`, { replace: true });
            }

            await guidedSermon.activate(sessionId, passage);
        },
        [effectiveSessionId, guidedSermon, isGuidedActive, createSession, agentIdForNew, agents, navigate],
    );

    /**
     * Crosses from the completed guided study into the sermon wizard. The guided
     * flow only minted the seed (placeholder sermonId, no doc); here we
     * materialize the sermon doc with that same id, then open the wizard at
     * `?id=<sermonId>` (the correct /generate route) where it lands on
     * homiletics. Without this the old CTA pointed `/dashboard/sermons?id=<seedId>`
     * — the list, which ignores the param.
     */
    const openCompletedWizard = useCallback(async () => {
        const seedId = guidedSermonSession?.seedId;
        if (!seedId) {
            navigate('/dashboard/sermons');
            return;
        }
        try {
            const seed = await pastoralSeedService.getById(seedId);
            if (!seed) {
                navigate('/dashboard/sermons');
                return;
            }
            await sermonService.ensureSermonForCompletedSeed(seed);
            navigate(`/dashboard/sermons/generate?id=${seed.sermonId}`);
        } catch (err) {
            console.error('[useGuidedSermonIntegration] openCompletedWizard failed', err);
            navigate('/dashboard/sermons');
        }
    }, [guidedSermonSession?.seedId, navigate]);

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
        openCompletedWizard,
        trySocraticSubmit,
    };
}
