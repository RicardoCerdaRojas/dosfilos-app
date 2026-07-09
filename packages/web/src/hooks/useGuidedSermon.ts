import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { toast } from 'sonner';
import { guidedSermonService, ResolveCuratedMisreadingsUseCase, verifyAnchorVerse, type ActivateGuidedSermonResult, type SubmitGuidedInsightResult, type SubmitGuidedWordStudiesResult } from '@dosfilos/application';
import { assemblePassageProfile, mergeCuratedMisreadings, detectorMisreadingStats, dropUnverifiedDetectorMisreadings, STRUCTURAL_SUFFICIENCY_SHADOW_SAMPLE_1_IN, type LiteraryGenre, type RawPassageProfile, type SocraticTurnResult, type AIChatSession, type AIChatMessage } from '@dosfilos/domain';
import { FirebaseVerifiedMisreadingRepository, RVR1960Repository } from '@dosfilos/infrastructure';

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
import { usePassageProfileGate, usePassageProfileEnforceGate, useAnchorFidelityEnforceGate, useGenreOverrideEnforceGate, useStep3GenreHelpGate } from '@/hooks/usePastoralFidelityGate';
import { LocalBibleService } from '@/services/LocalBibleService';
import { useTranslation } from '@/i18n';

/**
 * ADR-035 Capa 1 (modo sombra) — perfila el pasaje al activar y registra en
 * sombra. NON-BLOCKING por diseño: cualquier fallo se traga (la activación NO
 * puede romperse por el perfil). No surface ni persiste en el seed aún (eso es
 * PR2/PR3 tras adjudicar precisión en sombra). Fire-and-forget para no demorar
 * la UX de activación.
 */
// ADR-036 PR5/PR6 — Biblia ES (re-verificación autoritativa del verso) + resolver
// del piso curado (read-only repo). Singletons a nivel módulo.
const bibleRepoEs = new RVR1960Repository();
const curatedMisreadingResolver = new ResolveCuratedMisreadingsUseCase(
    new FirebaseVerifiedMisreadingRepository(),
    bibleRepoEs,
);
/** Predicado de existencia de verso (misma `verifyAnchorVerse`, determinista). */
const verseExists = (reference: string): boolean => verifyAnchorVerse(reference, bibleRepoEs).exists;

async function runPassageProfileShadow(
    seed: ActivateGuidedSermonResult['seed'],
    passage: string,
    enforceAnchorFidelity: boolean,
): Promise<void> {
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

        // ADR-036 PR6 — corte 1 (sombra): mide cuántas misreadings del DETECTOR
        // anclan a un verso real. Determinista (verifyAnchorVerse). Siempre se mide.
        const detectorStats = detectorMisreadingStats(profile, verseExists);

        // ADR-036 PR6 — VERIFY-DROP (enforce): bajo el flag, descarta las
        // misreadings del detector sin verso real (anti-alucinación). El piso
        // curado se mergea sobre el resultado (su garantía es independiente).
        const base = enforceAnchorFidelity ? dropUnverifiedDetectorMisreadings(profile, verseExists) : profile;

        // ADR-036 PR5 — piso curado: re-verifica autoritativo (verso existe AHORA)
        // + admite (yes + reviewed) + mergea con PRECEDENCIA sobre el runtime. Solo
        // las entradas que pasan el gate fail-closed en el PUNTO DE USO llegan al
        // perfil que confronta. Non-blocking: un fallo no rompe la activación, y el
        // perfil runtime queda como estaba.
        let merged = base;
        try {
            const curated = await curatedMisreadingResolver.execute(passage);
            if (curated.length > 0) merged = mergeCuratedMisreadings(base, curated);
        } catch (e) {
            console.warn('[useGuidedSermon] curated misreadings merge failed (non-blocking)', e);
        }

        // ADR-035 A: cristaliza el perfil en el seed (additivo, inerte). Lo lee
        // el enforce (passage_profile_enforce); bajo solo sombra queda como dato.
        // Cristaliza el MERGED (piso curado incluido); la sombra mide el detector
        // crudo (`profile`) sin contaminar la precisión con el piso curado.
        await guidedSermonService.crystallizePassageProfile(seed.id, merged);

        await httpsCallable(fns, 'recordPassageProfileShadow')({
            seedId: seed.id,
            passage,
            genres: profile.genres,
            schemaVersion: profile.schemaVersion,
            features: profile.features,
            movementCount: profile.movements.length,
            latencyMs,
            // ADR-036 PR6 corte 1 — verificación de anclas del detector.
            misreadingsTotal: detectorStats.misreadingsTotal,
            misreadingsWithVerifiedAnchor: detectorStats.misreadingsWithVerifiedAnchor,
            misreadingAnchorsTotal: detectorStats.anchorsTotal,
            misreadingAnchorsVerified: detectorStats.anchorsVerified,
            anchorFidelityEnforced: enforceAnchorFidelity,
        });
    } catch (err) {
        console.warn('[useGuidedSermon] passage profile shadow failed (non-blocking)', err);
    }
}

/**
 * Redacción v2 Fase 1 (§4.4) — muestreo determinista de la medición en sombra
 * del override de género (~1 de 4 turnos elegibles). Determinista sobre el seedId
 * para no encarecer cada turno y dar cobertura estable por estudio.
 */
const GENRE_SHADOW_SAMPLE_1_IN = 4;
function shouldSampleGenreShadow(seedId: string): boolean {
    let h = 0;
    for (let i = 0; i < seedId.length; i++) h = (h * 31 + seedId.charCodeAt(i)) | 0;
    return Math.abs(h) % GENRE_SHADOW_SAMPLE_1_IN === 0;
}

/**
 * Redacción v2 Fase 1 (§4.4) — medición en sombra del override de género.
 * Fire-and-forget, non-blocking, MUESTREADO: corre el juez de engagement de
 * género (Sonnet) SOLO para medir cómo adjudica en vivo, y registra el `verdict`
 * (confirmed | discrepancy | unclear) SIN confrontar al pastor. El juez es
 * fail-closed a unclear; una caída nunca afecta el turno.
 */
async function runGenreOverrideShadow(
    genreShadow: NonNullable<SocraticTurnResult['genreShadow']>,
    pastorMessage: string,
): Promise<void> {
    try {
        const fns = getFunctions();
        const res = await httpsCallable(fns, 'evaluateGenreEngagement')({
            pastorMessage,
            proposedGenre: genreShadow.proposedGenre,
            proposalRationale: 'Género inferido por el libro del pasaje.',
            criteria: genreShadow.criteria,
        });
        const judgment = (res.data as { judgment?: { verdict?: string; contradictsAnchor?: boolean } })?.judgment;
        if (!judgment) return;
        await httpsCallable(fns, 'recordPassageProfileShadow')({
            seedId: genreShadow.seedId,
            passage: genreShadow.passage,
            genreOverride: {
                proposedGenre: genreShadow.proposedGenre,
                verdict: judgment.verdict,
                sustained: judgment.contradictsAnchor === true,
            },
        });
    } catch (err) {
        console.warn('[useGuidedSermon] genre override shadow failed (non-blocking)', err);
    }
}

/** Muestreo determinista de la señal de suficiencia estructural (1 de N, knob de dominio). */
function shouldSampleStructuralShadow(seedId: string): boolean {
    if (STRUCTURAL_SUFFICIENCY_SHADOW_SAMPLE_1_IN <= 1) return true;
    let h = 0;
    for (let i = 0; i < seedId.length; i++) h = (h * 31 + seedId.charCodeAt(i)) | 0;
    return Math.abs(h) % STRUCTURAL_SUFFICIENCY_SHADOW_SAMPLE_1_IN === 0;
}

/**
 * Redacción v2 Fase 1 (§4.5) B5 — registro en sombra de la vara de suficiencia
 * estructural. Fire-and-forget, non-blocking, DETERMINISTA (el verdict ya viene
 * calculado del use case; el web solo registra). Sibling 'structuralSufficiency'
 * en passageProfileShadow. Lleva provenance + género destino del override (036).
 */
async function runStructuralSufficiencyShadow(
    s: NonNullable<SocraticTurnResult['structuralShadow']>,
): Promise<void> {
    try {
        await httpsCallable(getFunctions(), 'recordPassageProfileShadow')({
            seedId: s.seedId,
            passage: s.passage,
            structuralSufficiency: {
                qualifiedGenre: s.qualifiedGenre,
                provenance: s.provenance,
                verdict: s.verdict,
                overrideTargetGenre: s.overrideTargetGenre ?? null,
            },
        });
    } catch (err) {
        console.warn('[useGuidedSermon] structural sufficiency shadow failed (non-blocking)', err);
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
    const anchorFidelityEnforceGate = useAnchorFidelityEnforceGate();
    const genreOverrideEnforceGate = useGenreOverrideEnforceGate();
    const step3GenreHelpGate = useStep3GenreHelpGate();
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
                    void runPassageProfileShadow(result.seed, passage, anchorFidelityEnforceGate.enabled);
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
        [user?.uid, t, refreshSession, queryClient, passageProfileGate.enabled, anchorFidelityEnforceGate.enabled],
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
                    // Redacción v2 (§4.4) — confronta el override de género solo con
                    // genre_override_enforce on. Off ⇒ mide en sombra, no confronta.
                    enforceGenreOverride: genreOverrideEnforceGate.enabled,
                    // Redacción v2 (§4.5) — ayuda estructural sensible al género en el
                    // paso 3, solo con step3_genre_help on (guidance revisado). Off ⇒
                    // prompt clásico.
                    enableGenreStructuralHelp: step3GenreHelpGate.enabled,
                });
                refreshSession();
                surfaceCoverageNudge(result?.coverageReport);
                // Redacción v2 (§4.4) — medición en sombra del override de género:
                // muestreada, fire-and-forget, non-blocking. Solo con la sombra on
                // (passage_profile) y cuando el use case expuso la oportunidad
                // (paso 2, enforce off). Nunca demora ni rompe el turno.
                if (result?.genreShadow && passageProfileGate.enabled && shouldSampleGenreShadow(result.genreShadow.seedId)) {
                    void runGenreOverrideShadow(result.genreShadow, pastorMessage);
                }
                // Redacción v2 (§4.5) — señal de suficiencia estructural del paso 3:
                // determinista, muestreada (knob de dominio), fire-and-forget. Solo
                // con la sombra on (passage_profile) y cuando el use case expuso la
                // oportunidad (paso 3, nota sustantiva).
                if (result?.structuralShadow && passageProfileGate.enabled && shouldSampleStructuralShadow(result.structuralShadow.seedId)) {
                    void runStructuralSufficiencyShadow(result.structuralShadow);
                }
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
        [
            user?.uid,
            t,
            refreshSession,
            queryClient,
            passageProfileEnforceGate.enabled,
            genreOverrideEnforceGate.enabled,
            step3GenreHelpGate.enabled,
            passageProfileGate.enabled,
            surfaceCoverageNudge,
        ],
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
