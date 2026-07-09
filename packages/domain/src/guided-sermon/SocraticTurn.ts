/**
 * Phase 2.5 PR B (ADR-028) — Faculty Socratic Sermon Agent turn types.
 *
 * The agent takes one pastor message per turn and produces a typed output
 * that the orchestrator (`RunSocraticTurnUseCase`) interprets. No string
 * parsing in the use case — every policy returns this structured shape.
 *
 * Pure types; no LLM/Firestore dependencies. Domain layer.
 */

import type { PastoralSeedStepKey, StepValidationResult, WordStudy } from '../entities/PastoralSeed';
import type { PassageProfile } from '../entities/PassageProfile';

/**
 * Context passed to a step policy when building prompts / parsing replies
 * / detecting method errors. Carries everything the policy needs without
 * leaking the full session or seed shape into every method.
 */
export interface TurnContext {
    /** Bible passage under study (mirrors `pastoralSeed.passage`). */
    passage: string;
    /** Step the agent is currently working through. */
    currentStep: PastoralSeedStepKey;
    /** Pastor's draft for this step so far (may be empty on first attempt). */
    pastorDraft: string;
    /** Number of attempts already made on this step (0-based). Drives escalation. */
    attemptIndex: number;
    /** Confirmed genre, if available. Sharpens orientation in non-genre steps. */
    genre?: string;
    /**
     * Compact summary of what the pastor has produced in earlier steps. Lets
     * later-step policies cross-reference (e.g. the principle step verifying
     * grounding in the structural analysis). Domain-pure: just text fragments
     * keyed by step.
     */
    priorSteps?: Partial<Record<PastoralSeedStepKey, string>>;
    /**
     * Word studies already saved on the seed. Step 4 ACCUMULATES across turns
     * (the pastor studies one word per message), so the policy validates +
     * persists the merged set instead of just the current message.
     */
    existingWordStudies?: WordStudy[];
    /**
     * ADR-035 — perfil del pasaje cristalizado en el seed (B). Lo consume el
     * enforce (D): nudges por paso + confront de lectura errónea condicionados
     * por las features ruteadas a `currentStep`. Ausente ⇒ seed legacy / flag de
     * sombra sin perfil ⇒ flujo clásico (no-op). Aquí solo se transporta.
     */
    passageProfile?: PassageProfile;
    /**
     * ADR-035 enforce (D) — true solo con `passage_profile_enforce` on. Gatea los
     * nudges + el confront de lectura errónea. Ausente/false ⇒ clásico (las
     * policies y el dispatch no aplican nada del perfil).
     */
    enforceCoverage?: boolean;
    /**
     * Redacción v2 Fase 1 (§4.4) — enforce del override de género (paso 2).
     * SEPARADO de `enforceCoverage` a propósito (adjudicación y datos distintos;
     * flag propio `genre_override_enforce`, decisión diferida al enforce). Gatea
     * SOLO el dispatch de confront de género. Ausente/false ⇒ inerte (el flujo
     * clásico intacto). Sin cablear en Fase 1 ⇒ el dispatch entra dormido.
     */
    enforceGenreOverride?: boolean;
    /**
     * Redacción v2 Fase 1 (§4.5) B3 — enciende la ayuda estructural sensible al
     * género en el paso 3 (guía por género + ejemplos curados). Es andamiaje
     * FORMATIVO (no juicio), pero el texto pastoral-facing (`guidance`) requiere
     * revisión del fundador antes de embarcar live → sale detrás de este flag,
     * default off. Ausente/false ⇒ prompt clásico del paso 3, sin ramificar.
     */
    enableGenreStructuralHelp?: boolean;
}

/**
 * What the LLM returns (after the policy parses it). Discriminated union —
 * the orchestrator dispatches on `kind` with no `switch(stepKey)` anywhere.
 */
export type SocraticTurnOutput =
    | SocraticAcceptedOutput
    | SocraticOrientOutput
    | SocraticConfrontOutput;

/** The pastor's message satisfies the step. Persist + advance. */
export interface SocraticAcceptedOutput {
    kind: 'accepted';
    /** The validated, sanitized pastor text to persist into the seed field. */
    pastorTextToPersist: string;
    /** Short, pastoral acknowledgement the agent shows when advancing. */
    agentReply: string;
}

/**
 * The pastor's message is insufficient (too short, off-topic, vague). The
 * agent offers data + Socratic questions to help — never writes the answer.
 * Same shape as `StepOrientation` from ADR-026 so the UI reuses rendering.
 */
export interface SocraticOrientOutput {
    kind: 'orient';
    /** Why we did not accept (terse, internal — driven by the validator). */
    reason: string;
    /** Free-text agent message that introduces the orientation. */
    agentReply: string;
    /** Factual data points relevant to the step. */
    data: string[];
    /** Socratic questions to make the pastor think. */
    questions: string[];
    /** Optional caution (e.g. background not available). */
    caution?: string;
}

/**
 * The pastor committed a METHOD ERROR (wrong literary genre, exegetical
 * leap, inconsistent reading rule). The agent confronts — names the error
 * and reframes as a question. Never writes the correct interpretation.
 */
export interface SocraticConfrontOutput {
    kind: 'confront';
    /** Human-readable label of the error (e.g. "genre-mismatch"). */
    errorLabel: string;
    /** The confronting message — names the error + reframes as question. */
    agentReply: string;
    /** Factual data that grounds the confrontation (e.g. the actual genre). */
    data: string[];
    /** Reframing questions. */
    questions: string[];
}

/**
 * A method-error report produced by a policy's `detectMethodError`. The
 * confront output is then derived from this. Separate so detection is
 * cheap + testable without a full LLM call when the heuristic is local.
 */
export interface MethodErrorReport {
    /** Short label (e.g. `genre-mismatch`, `structural-misread`, `exegetical-leap`). */
    label: string;
    /** Brief description of the detected error. Pastoral tone, español. */
    description: string;
    /** Confidence in the detection [0..1]. Below threshold → not confronted. */
    confidence: number;
}

/**
 * What the agent surfaces to the chat client after one turn. Wraps the
 * policy's `SocraticTurnOutput` plus state-machine effects.
 */
export interface SocraticTurnResult {
    output: SocraticTurnOutput;
    /** Step the session moves to after this turn (may equal current on orient/confront). */
    nextStep: PastoralSeedStepKey;
    /** True when this turn completed the entire 8-step spine. */
    sermonReady: boolean;
    /** Updated attempt counters (echoed for the client to render progress). */
    stepAttempts: Record<PastoralSeedStepKey, number>;
    /**
     * ADR-035 E — reporte de cobertura, presente SOLO al cerrar el estudio
     * (sermonReady) con enforce on. Red de seguridad sobre el Motor B: si quedó
     * algún must-touch sin tratar (`gateStatus: 'soft-block'`), el web nudgea
     * "no abordaste X". Ausente ⇒ no aplica (no cierre / enforce off / sin perfil).
     */
    coverageReport?: import('../services/passageCoverage').CoverageReport;
    /**
     * Redacción v2 Fase 1 (§4.4) — OPORTUNIDAD de medición en sombra del override
     * de género. Presente SOLO en turnos del paso 2 (contextGenre), con género
     * propuesto y mensaje sustantivo, cuando el enforce está OFF (shadow-first: si
     * enforce on, el dispatch ya juzgó). Es DATO PURO (sin LLM): el web decide,
     * muestreado y fire-and-forget, si corre el juez de engagement de género y
     * registra el `verdict`. Ausente ⇒ el web no mide este turno.
     */
    genreShadow?: {
        seedId: string;
        passage: string;
        proposedGenre: string;
        criteria: string;
    };
    /**
     * Redacción v2 Fase 1 (§4.5) B2 — señal de sombra de la VARA de suficiencia
     * estructural del paso 3. DETERMINISTA (sin LLM): el verdict se calcula en el
     * use case; el web solo lo registra como sibling `structuralSufficiency` en
     * passageProfileShadow (B5). Presente SOLO en turnos del paso 3 con nota
     * sustantiva.
     *
     * Lleva el GÉNERO calificado + su PROVENANCE (contrato de PR1, estructurado,
     * nunca redactado — 036): en la ventana de shadow (genre_override_enforce OFF)
     * la vara califica contra el género INFERIDO (no se escribe de vuelta la
     * corrección del pastor); la provenance permite NO conflar "no analizó" con
     * "califiqué contra un género mal inferido" al leer la sombra.
     */
    structuralShadow?: {
        seedId: string;
        passage: string;
        /** El género contra el que se calificó la vara (inferido en shadow). */
        qualifiedGenre: string;
        /** Cómo llegó ese género (aiProposed | userConfirmed | userOverride). */
        provenance: import('../entities/PastoralSeed').GenreProvenance;
        verdict: import('./structuralSufficiency').StructuralSufficiency;
    };
}

export type { StepValidationResult };
