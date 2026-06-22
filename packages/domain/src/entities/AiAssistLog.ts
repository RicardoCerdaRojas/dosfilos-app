/**
 * Pastoral Fidelity — Phase 1.6 (ADR-024) first-class assistance audit.
 *
 * Replaces the scattered audit (`toolsConsulted` / `pasteEvents`) as the
 * canonical record of *where the assistant helped and whether the pastor
 * edited the output*. Additive in 1.6: it coexists with the legacy fields;
 * deprecation of the scattered audit is deferred to a later phase.
 *
 * Feeds the "% tuyo" metric (Fase 4): an assist whose output the pastor
 * edited counts differently from one accepted verbatim.
 *
 * Persisted as subcollection `pastoralSeeds/{seedId}/aiAssistLogs/{id}`.
 *
 * Hard rule (tested): steps 1 (reading / first impression) and 8 (insight)
 * NEVER produce an `AiAssistLog`. Those are the pastor's own voice. Step 7
 * (timeless principle) may only log `eisegesisCheck` — a *verifier*, never
 * a generator.
 */

import type { PastoralSeedStepKey } from './PastoralSeed';

/**
 * What the assistant did. Each value maps to a concrete assist surface
 * in the eight-step spine (ADR-024).
 */
export type AiAssistType =
    /** Step 1 sub-tool: original-text parsing/gloss display. Data-driven, not LLM. */
    | 'parsing'
    /** Step 2: genre proposal from the book panorama. */
    | 'genreProposal'
    /** Step 2: book outline from the book panorama. */
    | 'bookOutline'
    /** Step 2: historical-cultural background (RAG). */
    | 'historicalContext'
    /** Step 3: structural/clause display. */
    | 'structuralDisplay'
    /** Step 3: grammar check ("the 'main' clause is subordinate"). */
    | 'grammarCheck'
    /** Step 4: ranked word candidates. */
    | 'wordCandidates'
    /** Step 4: lexical tutor (PastoralWordStudyModal). */
    | 'lexicalTutor'
    /** Step 5: cross-reference engine retrieval. */
    | 'crossRefEngine'
    /** Step 7 / inline: eisegesis verification (verifier, never generator). */
    | 'eisegesisCheck'
    /**
     * Phase 2.5 (ADR-026): step orientation by the Study Companion — data +
     * Socratic questions on a method step (genre, structure, words,
     * parallels, function). Verifier-orienter, never writes the answer.
     */
    | 'stepOrientation'
    /**
     * Phase 2.5 PR B (ADR-028): one accepted turn of the Faculty Socratic
     * Sermon Agent. Indicates the pastor's message satisfied the current
     * step's validator and was persisted to the seed. The agent asked +
     * validated; the pastor wrote the content.
     */
    | 'socraticGuidance'
    /**
     * Phase 2.5 PR B (ADR-028): the Socratic Sermon Agent confronted a
     * method error (wrong genre, lexical leakage in the structural step,
     * proof-texting, modern-application leap). The pastor's input was not
     * persisted; the seed remained unchanged for the step.
     */
    | 'socraticConfrontation'
    /**
     * Phase 2.5 Tier 3 (proposal `structural-puzzle-tier3.md`): one
     * completed structural puzzle session. The pastor reconstructed the
     * passage's clause hierarchy by placing pieces into zones; the system
     * gave Socratic hints on wrong placements without revealing the answer.
     * Logged once per completed puzzle (not per piece).
     */
    | 'structuralPuzzle'
    /**
     * ADR-035 (D) — el pastor sostuvo su lectura tras el re-confront de una
     * lectura errónea (override floor in-step): trabajó/ignoró el ancla, agotó el
     * tope de re-confront y se le liberó al flujo normal con la discrepancia
     * REGISTRADA. Evento de CONDUCCIÓN pedagógica in-step — NO un override del
     * publish-gate (Motor B), que se mantiene separado.
     */
    | 'coverageMisreadingOverride';

export interface AiAssistLog {
    id: string;
    seedId: string;
    userId: string;
    /** The step the assist happened in. */
    stepKey: PastoralSeedStepKey;
    assistType: AiAssistType;
    /**
     * Whether the pastor edited the assistant's output before persisting.
     * Drives the "% tuyo" metric. `false` means accepted verbatim.
     */
    outputWasEditedByUser: boolean;
    createdAt: Date;
}

/**
 * Steps where AI-GENERATED CONTENT must never enter the seed — the pastor's
 * own voice lives there. Enforced by `assertAiAssistAllowed` + tested.
 */
export const AI_ASSIST_FORBIDDEN_STEPS: PastoralSeedStepKey[] = ['reading', 'insight'];

/**
 * Assist types that are VALIDATION/observation-tier — they do NOT inject
 * content into the seed. Safe to log on any step (including the forbidden
 * ones) because the audit still reflects the pastor's verbatim voice.
 * Phase 2.5 (ADR-026/028) added these tiers: orientation, socratic guidance
 * (accepted turn = pastor's content + agent's validation), socratic
 * confrontation (no persist), eisegesis verifier.
 */
const VALIDATION_TIER_ASSISTS = new Set<AiAssistType>([
    'stepOrientation',
    'socraticGuidance',
    'socraticConfrontation',
    'eisegesisCheck',
]);

/** True when this step+assistType combination is allowed to record a log. */
export function isAiAssistAllowed(stepKey: PastoralSeedStepKey, assistType?: AiAssistType): boolean {
    if (!AI_ASSIST_FORBIDDEN_STEPS.includes(stepKey)) return true;
    // Forbidden step → only validation-tier assists may log.
    return assistType !== undefined && VALIDATION_TIER_ASSISTS.has(assistType);
}

/**
 * Guard used by the write path. Throws if a caller tries to log a
 * content-tier assist on an AI-forbidden step — fail loud rather than
 * silently contaminating the audit that feeds "% tuyo". Validation-tier
 * assists pass through on any step.
 */
export function assertAiAssistAllowed(stepKey: PastoralSeedStepKey, assistType?: AiAssistType): void {
    if (!isAiAssistAllowed(stepKey, assistType)) {
        throw new Error(
            `AiAssistLog is forbidden on step "${stepKey}" with content-tier assistType "${assistType ?? '<unspecified>'}" — that step is the pastor's own voice.`,
        );
    }
}
