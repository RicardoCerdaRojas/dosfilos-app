/**
 * Phase 2.5 PR B (ADR-028) — Guided sermon session entity.
 *
 * Lives as an OPTIONAL field on `AIChatSession` (additive, backward
 * compatible). When present + `status === 'active'`, the chat client routes
 * messages through `runSocraticTurn` instead of the normal orchestrated
 * send. When `paused`, the session is dormant but resumable. When
 * `completed`, the `pastoralSeed` is ready and the wizard lands at
 * homiletics.
 *
 * Pure entity; no infra dependencies. Domain layer.
 */

import { PASTORAL_SEED_STEP_ORDER, type PastoralSeedStepKey } from '../entities/PastoralSeed';

export type GuidedSermonStatus = 'active' | 'paused' | 'completed';

export interface GuidedSermonSession {
    /** Foreign key to `pastoralSeeds/{seedId}` — the artifact being built. */
    seedId: string;
    /** Bible passage under study (snapshot for the agent's prompts). */
    passage: string;
    /** Where the state machine currently sits. */
    currentStep: PastoralSeedStepKey;
    status: GuidedSermonStatus;
    /** Attempt counter per step — feeds escalation + telemetry. */
    stepAttempts: Record<PastoralSeedStepKey, number>;
    startedAt: Date;
    /** Set when `status === 'completed'`. */
    completedAt?: Date;
}

/** Empty attempt map — zero for every step. */
export function emptyStepAttempts(): Record<PastoralSeedStepKey, number> {
    const out = {} as Record<PastoralSeedStepKey, number>;
    for (const k of PASTORAL_SEED_STEP_ORDER) out[k] = 0;
    return out;
}

/** Factory for a fresh active session, starting at step 1. */
export function createGuidedSermonSession(args: {
    seedId: string;
    passage: string;
    now?: Date;
}): GuidedSermonSession {
    return {
        seedId: args.seedId,
        passage: args.passage,
        currentStep: PASTORAL_SEED_STEP_ORDER[0],
        status: 'active',
        stepAttempts: emptyStepAttempts(),
        startedAt: args.now ?? new Date(),
    };
}
