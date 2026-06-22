import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { toast } from 'sonner';
import { guidedSermonService, type ActivateGuidedSermonResult, type SubmitGuidedInsightResult, type SubmitGuidedWordStudiesResult } from '@dosfilos/application';
import { assemblePassageProfile, type LiteraryGenre, type RawPassageProfile, type SocraticTurnResult, type AIChatSession, type AIChatMessage } from '@dosfilos/domain';

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

export interface SubmitWordStudiesArgs {
    sessionId: string;
    studies: Array<{ word: string; reference: string; pastorDiscovery: string }>;
    renderedText: string;
    affirmationText: string;
}
import { useFirebase } from '@/context/firebase-context';
import { usePassageProfileGate, usePassageProfileEnforceGate } from '@/hooks/usePastoralFidelityGate';
import { LocalBibleService } from '@/services/LocalBibleService';
import { useTranslation } from '@/i18n';

/**
 * ADR-035 Capa 1 (modo sombra) — perfila el pasaje al activar y registra en
 * sombra. NON-BLOCKING por diseño: cualquier fallo se traga (la activación NO
 * puede romperse por el perfil). No surface ni persiste en el seed aún (eso es
 * PR2/PR3 tras adjudicar precisión en sombra). Fire-and-forget para no demorar
 * la UX de activación.
 */
async function runPassageProfileShadow(seed: ActivateGuidedSermonResult['seed'], passage: string): Promise<void> {
    try {
        const passageText = LocalBibleService.getVerses(passage, 'es');
        if (!passageText) return; // pasaje no resoluble → se omite (no bloquea)

        const fns = getFunctions();
        const t0 = Date.now();
        const res = await httpsCallable(fns, 'profilePassage')({ passage, passageText });
        const latencyMs = Date.now() - t0;
        const raw = (res.data as { profile?: RawPassageProfile })?.profile;
        if (!raw) return;

        // Ensamblado de dominio: aplica la regla anti-alucinación (descarta
        // features sin ancla) antes de medir en sombra.
        const genre = seed.contextGenre?.genre;
        const genres: LiteraryGenre[] = genre ? [genre] : [];
        const profile = assemblePassageProfile(raw, genres, new Date());

        // ADR-035 A: cristaliza el perfil en el seed (additivo, inerte). Lo lee
        // el enforce (passage_profile_enforce); bajo solo sombra queda como dato.
        await guidedSermonService.crystallizePassageProfile(seed.id, profile);

        await httpsCallable(fns, 'recordPassageProfileShadow')({
            seedId: seed.id,
            passage,
            genres: profile.genres,
            schemaVersion: profile.schemaVersion,
            features: profile.features,
            movementCount: profile.movements.length,
            latencyMs,
        });
    } catch (err) {
        console.warn('[useGuidedSermon] passage profile shadow failed (non-blocking)', err);
    }
}

interface UseGuidedSermonResult {
    /** True while a turn / activation is in flight. */
    isProcessing: boolean;
    /** Activate guided mode on `sessionId` with `passage`. */
    activate: (sessionId: string, passage: string) => Promise<ActivateGuidedSermonResult | null>;
    /** Send one pastor message; receive agent reply via the chat session subscription. */
    runTurn: (sessionId: string, pastorMessage: string) => Promise<SocraticTurnResult | null>;
    /** Paso 8 estructurado: persiste el Insight desde el formulario (sin LLM/parse). */
    submitInsight: (args: SubmitInsightArgs) => Promise<SubmitGuidedInsightResult | null>;
    /** Paso 4 estructurado: persiste los Estudios de Palabras desde el formulario. */
    submitWordStudies: (args: SubmitWordStudiesArgs) => Promise<SubmitGuidedWordStudiesResult | null>;
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
    const passageProfileGate = usePassageProfileGate();
    const passageProfileEnforceGate = usePassageProfileEnforceGate();
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

    // ADR-035 E — nudge de cobertura al cierre (red de seguridad, no bloquea): si
    // quedó algún must-touch sin tratar, lo recuerda. Reutilizado por runTurn (si
    // un turno completa) y submitInsight (cierre real del estudio).
    const surfaceCoverageNudge = useCallback(
        (report: { mustTouchUntouched: number; items: Array<{ coverageRule: string; touched: boolean; label: string }> } | undefined) => {
            if (!report || report.mustTouchUntouched <= 0) return;
            const items = report.items
                .filter((i) => i.coverageRule === 'must-touch' && !i.touched)
                .map((i) => i.label)
                .join('; ');
            if (items) toast(t('coverage.closeNudge', { items }));
        },
        [t],
    );

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
                // ADR-035 (modo sombra): perfila el pasaje fire-and-forget tras
                // activar. Gated + non-blocking — nunca afecta la activación.
                if (passageProfileGate.enabled) {
                    void runPassageProfileShadow(result.seed, passage);
                }
                refreshSession();
                return result;
            } catch (err) {
                console.error('[useGuidedSermon] activate failed', err);
                const msg = err instanceof Error ? err.message : '';
                toast.error(
                    msg.includes('GUIDED_SERMON_INVALID_PASSAGE')
                        ? t('activation.invalidPassage')
                        : t('error.activate'),
                );
                return null;
            } finally {
                setIsProcessing(false);
            }
        },
        [user?.uid, t, refreshSession, queryClient, passageProfileGate.enabled],
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
                    // ADR-035 enforce (D) — solo confronta/nudgea con el flag
                    // passage_profile_enforce on. Off ⇒ clásico. El dispatch que
                    // lo consume llega en el commit 3.
                    enforceCoverage: passageProfileEnforceGate.enabled,
                });
                refreshSession();
                surfaceCoverageNudge(result?.coverageReport);
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
        [user?.uid, t, refreshSession, queryClient, passageProfileEnforceGate.enabled, surfaceCoverageNudge],
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
                    enforceCoverage: passageProfileEnforceGate.enabled,
                });
                refreshSession();
                surfaceCoverageNudge(result?.coverageReport);
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
        [user?.uid, t, refreshSession, queryClient, passageProfileEnforceGate.enabled, surfaceCoverageNudge],
    );

    const submitWordStudies = useCallback(
        async (args: SubmitWordStudiesArgs) => {
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
                              { id: optimisticId, role: 'user', content: args.renderedText, timestamp: new Date() } as AIChatMessage,
                          ],
                      }
                    : prev,
            );
            try {
                const result = await guidedSermonService.submitWordStudies({
                    userId: user.uid,
                    sessionId: args.sessionId,
                    studies: args.studies,
                    renderedText: args.renderedText,
                    affirmationText: args.affirmationText,
                });
                refreshSession();
                return result;
            } catch (err) {
                console.error('[useGuidedSermon] submitWordStudies failed', err);
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

    return { isProcessing, activate, runTurn, submitInsight, submitWordStudies, pause, resume };
}
