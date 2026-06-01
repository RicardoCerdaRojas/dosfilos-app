/**
 * Pastoral Fidelity — Phase 3 PR 2 (ADR-029 §Q3/Q5) — pure publish-gate
 * decision.
 *
 * `computeFidelitySummary` (PR 1) already maps a verdict list to a
 * `FidelityGateStatus` (`pass | soft-block | hard-block`). This function
 * turns that status — plus the pastor's optional override — into a single
 * publish decision the application service enforces and the pre-publish
 * modal renders.
 *
 * Policy (ADR-029):
 *   - `pass`        → publish proceeds.
 *   - `hard-block`  → NEVER overridable (>20% unrelated|contradicts). The
 *                     publish call is refused even if an override is passed.
 *   - `soft-block`  → overridable with a justification of at least
 *                     `FIDELITY_OVERRIDE_MIN_CHARS` chars (Q5, reuses the
 *                     ADR-027 paternalism policy — one threshold, not two).
 *
 * Pure — no I/O, no clock. The application service stamps `overriddenAt`
 * with its own clock and persists the resulting `GateOverride`.
 */

import type { FidelityGateStatus, GateOverride } from '../entities/FidelityReport';
import { FIDELITY_OVERRIDE_MIN_CHARS } from '../entities/FidelityReport';

/**
 * What the pastor supplies when proceeding past a soft-block. Mirrors
 * `GateOverride` minus the server-stamped `overriddenAt`.
 */
export interface PublishOverrideInput {
    /** Justification — must reach `FIDELITY_OVERRIDE_MIN_CHARS` after trim. */
    reason: string;
    overriddenBy: string;
    bypassedKind: GateOverride['bypassedKind'];
}

export type PublishGateReason =
    /** Under both thresholds — nothing to confront. */
    | 'pass'
    /** Soft-block cleared by a valid override. */
    | 'soft-block-overridden'
    /** >20% unrelated|contradicts — no override path exists. */
    | 'hard-block'
    /** Soft-block with no override supplied. */
    | 'soft-block-needs-override'
    /** Soft-block override supplied but justification too short. */
    | 'override-too-short';

export type PublishGateDecision =
    | { allowed: true; reason: Extract<PublishGateReason, 'pass' | 'soft-block-overridden'> }
    | {
          allowed: false;
          reason: Extract<
              PublishGateReason,
              'hard-block' | 'soft-block-needs-override' | 'override-too-short'
          >;
      };

/**
 * Thrown by the application service when a fidelity gate refuses publish.
 * Carries the machine-readable `reason` so the UI can render the right
 * confrontation copy without string-matching `error.message`.
 */
export class FidelityGateError extends Error {
    constructor(public readonly reason: PublishGateReason) {
        super(`Fidelity gate refused publish: ${reason}`);
        this.name = 'FidelityGateError';
        // Restore prototype chain for `instanceof` across transpilation targets.
        Object.setPrototypeOf(this, FidelityGateError.prototype);
    }
}

/** Trimmed length of a candidate override justification. */
function justificationLength(reason: string | undefined): number {
    return (reason ?? '').trim().length;
}

/**
 * Decide whether a sermon may publish given its fidelity gate status and an
 * optional override. Pure. The caller (application service) is responsible
 * for actually running the fidelity pass beforehand so `gateStatus` is
 * fresh, and for persisting the `GateOverride` when this returns
 * `soft-block-overridden`.
 */
export function evaluatePublishGate(
    gateStatus: FidelityGateStatus,
    override?: PublishOverrideInput,
): PublishGateDecision {
    if (gateStatus === 'pass') {
        return { allowed: true, reason: 'pass' };
    }

    // Hard-block is terminal: an override, even a well-formed one, is ignored.
    if (gateStatus === 'hard-block') {
        return { allowed: false, reason: 'hard-block' };
    }

    // soft-block — overridable with a sufficiently long justification.
    if (!override) {
        return { allowed: false, reason: 'soft-block-needs-override' };
    }
    if (justificationLength(override.reason) < FIDELITY_OVERRIDE_MIN_CHARS) {
        return { allowed: false, reason: 'override-too-short' };
    }
    return { allowed: true, reason: 'soft-block-overridden' };
}
