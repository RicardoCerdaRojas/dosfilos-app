/**
 * Phase 2.5 PR B (ADR-028) — Pure state machine over `GuidedSermonSession`.
 *
 * Zero dependencies on LLM / Firestore / React — testable as a math
 * function. The orchestrator (`RunSocraticTurnUseCase`) calls these to
 * compute next state; persistence happens elsewhere.
 *
 * Invariants (pinned by tests):
 *  - Step order is the canonical eight-step spine (`PASTORAL_SEED_STEP_ORDER`).
 *  - `advance` only fires when the current step's pastor input passed the
 *    validator + was persisted; never from inside the state machine.
 *  - `back` only allows moving to a step already attempted (no skipping
 *    forward; honors the spine's linearity).
 *  - `complete` only fires when the current step is the LAST one AND it
 *    is the one being advanced.
 */

import { PASTORAL_SEED_STEP_ORDER, type PastoralSeedStepKey } from '../entities/PastoralSeed';
import type { GuidedSermonSession } from './GuidedSermonSession';

/** Index of a step in the canonical order. -1 if not found. */
export function stepIndex(stepKey: PastoralSeedStepKey): number {
    return PASTORAL_SEED_STEP_ORDER.indexOf(stepKey);
}

/**
 * Mark the current step as completed and move to the next one. Returns the
 * NEW state (immutable). If the current step is the last in the spine, the
 * session transitions to `completed`.
 */
export function advance(state: GuidedSermonSession, now: Date = new Date()): GuidedSermonSession {
    const idx = stepIndex(state.currentStep);
    if (idx === -1) {
        throw new Error(`Unknown currentStep "${state.currentStep}" in guided sermon session.`);
    }
    const isLast = idx === PASTORAL_SEED_STEP_ORDER.length - 1;
    if (isLast) {
        return {
            ...state,
            status: 'completed',
            completedAt: now,
        };
    }
    return {
        ...state,
        currentStep: PASTORAL_SEED_STEP_ORDER[idx + 1],
    };
}

/**
 * Pastor's input was insufficient or a method error fired. Bump the attempt
 * counter on the current step; state otherwise unchanged.
 */
export function retry(state: GuidedSermonSession): GuidedSermonSession {
    const attempts = { ...state.stepAttempts };
    attempts[state.currentStep] = (attempts[state.currentStep] ?? 0) + 1;
    return { ...state, stepAttempts: attempts };
}

/**
 * Go back to an earlier step (only). Forward jumps are forbidden — the spine
 * is linear. The target must be a step the pastor has actually started
 * (attempts > 0), to prevent skipping into work that was never done.
 */
export function back(state: GuidedSermonSession, target: PastoralSeedStepKey): GuidedSermonSession {
    const targetIdx = stepIndex(target);
    const currentIdx = stepIndex(state.currentStep);
    if (targetIdx === -1) throw new Error(`Unknown target step "${target}".`);
    if (targetIdx >= currentIdx) {
        throw new Error(`Cannot jump forward in guided sermon (current: ${state.currentStep}, target: ${target}).`);
    }
    if ((state.stepAttempts[target] ?? 0) === 0) {
        throw new Error(`Cannot jump back to step "${target}" — it was never started.`);
    }
    return { ...state, currentStep: target };
}

/** Pause the session — recoverable. */
export function pause(state: GuidedSermonSession): GuidedSermonSession {
    if (state.status === 'completed') return state;
    return { ...state, status: 'paused' };
}

/** Resume a paused session. */
export function resume(state: GuidedSermonSession): GuidedSermonSession {
    if (state.status !== 'paused') return state;
    return { ...state, status: 'active' };
}

/** Is this the last step of the spine? Used to decide CTA after acceptance. */
export function isLastStep(stepKey: PastoralSeedStepKey): boolean {
    return stepIndex(stepKey) === PASTORAL_SEED_STEP_ORDER.length - 1;
}
