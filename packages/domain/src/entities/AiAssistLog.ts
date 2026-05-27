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
    | 'eisegesisCheck';

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
 * Steps where an `AiAssistLog` must never be written — the pastor's own
 * voice lives there. Enforced by `assertAiAssistAllowed` + tested.
 */
export const AI_ASSIST_FORBIDDEN_STEPS: PastoralSeedStepKey[] = ['reading', 'insight'];

/** True when `stepKey` is allowed to record an `AiAssistLog`. */
export function isAiAssistAllowed(stepKey: PastoralSeedStepKey): boolean {
    return !AI_ASSIST_FORBIDDEN_STEPS.includes(stepKey);
}

/**
 * Guard used by the write path. Throws if a caller tries to log an assist
 * on an AI-forbidden step — fail loud rather than silently contaminating
 * the audit that feeds "% tuyo".
 */
export function assertAiAssistAllowed(stepKey: PastoralSeedStepKey): void {
    if (!isAiAssistAllowed(stepKey)) {
        throw new Error(
            `AiAssistLog is forbidden on step "${stepKey}" — that step is the pastor's own voice.`,
        );
    }
}
