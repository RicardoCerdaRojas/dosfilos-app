import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams, type NavigateFunction } from 'react-router-dom';
import type { AIChatSession, AIAgent } from '@dosfilos/domain';
import { pastoralSeedService, sermonService } from '@dosfilos/application';
import { useGuidedSermon, type SubmitInsightArgs, type SubmitWordStudiesArgs } from '@/hooks/useGuidedSermon';
import { useStudyDepthGate } from '@/hooks/usePastoralFidelityGate';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { useWitnessValidation } from '@/hooks/useWitnessValidation';
import {
    classifyShadowFailure,
    logDoxologicalShadow,
    logDoxologicalShadowFailure,
    persistDoxologicalGateForResult,
} from '@/lib/doxologicalShadow';
import { useTranslation } from '@/i18n';

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
    /** Paso 8 estructurado: envía los campos del formulario de Insight. */
    submitInsight: (
        args: Pick<SubmitInsightArgs, 'insight' | 'renderedInsightText'>,
    ) => Promise<import('@dosfilos/application').SubmitGuidedInsightResult | null>;
    /**
     * Redacción v2 0b-B (§4.4) — paso 2: registra el ACTO del pastor sobre el
     * género. Devuelve la procedencia resultante, o `null` si el dominio lo
     * rechazó (centinela/stub) o no hay seed.
     */
    pronounceGenre: (
        chosenGenre: string,
        proposedGenre?: string,
    ) => Promise<'userConfirmed' | 'userOverride' | null>;
    /** Paso 4 estructurado: envía la lista de estudios de palabras. */
    submitWordStudies: (
        args: Pick<SubmitWordStudiesArgs, 'studies' | 'renderedText'>,
    ) => Promise<import('@dosfilos/application').SubmitGuidedWordStudiesResult | null>;
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
    const { enabled: threeWitnessesEnabled } = useFeatureFlag('three_witnesses');
    const witnessValidation = useWitnessValidation();
    const guidedSermon = useGuidedSermon();
    const { t } = useTranslation('guidedSermon');
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

    /**
     * Grieta doxológica — modo sombra, flujo guiado.
     *
     * El guiado es el hueco real: hoy NO corre gate de testigos. El texto
     * doxológico se autora por DOS rutas guiadas — el formulario estructurado
     * (`submitInsight`) y el texto socrático libre en el paso Insight
     * (`runTurn` → InsightStepPolicy.persistTo). Ambas disparan este shadow,
     * DESACOPLADO y fail-open: el pastor ya avanzó cuando corre, y un fallo se
     * traga (registrándolo como fila de fallo). Cero cambio de UX. Solo cuando
     * `three_witnesses` está on.
     */
    const runGuidedDoxologicalShadow = useCallback(
        async (seedId: string, flow: 'guided-insight' | 'guided-socratic') => {
            try {
                const seed = await pastoralSeedService.getById(seedId);
                if (!seed) return;
                const outcome = await witnessValidation.validate({
                    seed,
                    confessionalWitnessesEnabled: true,
                    // El gate degrada a los paralelos del propio pastor cuando el
                    // motor de cross-refs está vacío (mismo contrato que el wizard).
                    crossRefs: [],
                });
                if (!outcome.result) {
                    await logDoxologicalShadowFailure({
                        seedId,
                        sermonId: seed.sermonId,
                        flow,
                        failure: 'witness validation returned no result',
                        failureCause: 'error-callable',
                    });
                    return;
                }
                await logDoxologicalShadow({
                    result: outcome.result,
                    flow,
                    witnessLatencyMs: outcome.latencyMs,
                    cacheHit: outcome.cacheHit,
                    oneShotVerdict: null,
                });
                // Capa 2.B (puente de compat): persiste el veredicto en el seed.
                await persistDoxologicalGateForResult(outcome.result);
            } catch (err) {
                await logDoxologicalShadowFailure({
                    seedId,
                    sermonId: '',
                    flow,
                    failure: err instanceof Error ? err.message : 'unknown shadow error',
                    failureCause: classifyShadowFailure(err),
                });
            }
        },
        [witnessValidation],
    );

    const trySocraticSubmit = useCallback(
        async (message: string): Promise<boolean> => {
            if (!isGuidedActive || !effectiveSessionId) return false;
            const trimmed = message.trim();
            if (!trimmed) return true; // claim "handled" so caller skips fallback
            // El paso ANTES del turno: si era Insight, el texto socrático libre
            // puede autorar la aplicación doxológica vía InsightStepPolicy →
            // ruta de autoría que también debe observarse en sombra.
            const stepBefore = guidedSermonSession?.currentStep;
            const seedId = guidedSermonSession?.seedId;
            setInput('');
            await guidedSermon.runTurn(effectiveSessionId, trimmed);
            if (stepBefore === 'insight' && threeWitnessesEnabled && seedId) {
                void runGuidedDoxologicalShadow(seedId, 'guided-socratic');
            }
            return true;
        },
        [
            effectiveSessionId,
            guidedSermon,
            isGuidedActive,
            setInput,
            guidedSermonSession?.currentStep,
            guidedSermonSession?.seedId,
            threeWitnessesEnabled,
            runGuidedDoxologicalShadow,
        ],
    );

    /** Paso 8 estructurado: el formulario de Insight envía sus campos directo. */
    const submitInsight = useCallback(
        async (args: Pick<SubmitInsightArgs, 'insight' | 'renderedInsightText'>) => {
            if (!effectiveSessionId) return null;
            const result = await guidedSermon.submitInsight({
                sessionId: effectiveSessionId,
                insight: args.insight,
                renderedInsightText: args.renderedInsightText,
                affirmationText: t('insight.affirmation'),
            });
            // Shadow desacoplado: NO se await-ea antes de devolver → el avance del
            // pastor no espera a los testigos. Solo con flag on + Insight aceptado.
            const seedId = guidedSermonSession?.seedId;
            if (result?.accepted && threeWitnessesEnabled && seedId) {
                void runGuidedDoxologicalShadow(seedId, 'guided-insight');
            }
            return result;
        },
        [effectiveSessionId, guidedSermon, t, threeWitnessesEnabled, guidedSermonSession?.seedId, runGuidedDoxologicalShadow],
    );

    /** Paso 4 estructurado: la lista de estudios de palabras se envía directo. */
    const submitWordStudies = useCallback(
        async (args: Pick<SubmitWordStudiesArgs, 'studies' | 'renderedText'>) => {
            if (!effectiveSessionId) return null;
            return guidedSermon.submitWordStudies({
                sessionId: effectiveSessionId,
                studies: args.studies,
                renderedText: args.renderedText,
                affirmationText: t('wordStudy.affirmation'),
            });
        },
        [effectiveSessionId, guidedSermon, t],
    );

    /**
     * Redacción v2 0b-B (§4.4) — paso 2: el acto del pastor sobre el género.
     * Escribe en el seed de la sesión guiada; no manda turno ni avanza paso.
     */
    const pronounceGenre = useCallback(
        async (chosenGenre: string, proposedGenre?: string) => {
            const seedId = guidedSermonSession?.seedId;
            if (!seedId) return null;
            return guidedSermon.pronounceGenre({ seedId, proposedGenre, chosenGenre });
        },
        [guidedSermon, guidedSermonSession?.seedId],
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
        submitInsight,
        submitWordStudies,
        pronounceGenre,
    };
}
