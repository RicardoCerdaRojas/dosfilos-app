/**
 * Pastoral Fidelity — Phase 4 PR 1 (ADR-033) — pure contra-scan gate decision.
 *
 * Turns a `ContraScanReport` status — plus the pastor's optional consideration
 * note or override — into a single publish decision. Mirrors the shape of
 * `evaluatePublishGate` (Phase 3) so the UI confrontation flow is consistent,
 * but operates on the INDEPENDENT contra-scan report (not the dormant
 * `FidelityReport` — ADR-032).
 *
 * Policy (ADR-033):
 *   - `no-dissent`  → publish proceeds (nothing in the library to confront).
 *   - `pass`        → publish proceeds (a consideration / override is present).
 *   - `soft-block`  → blocked until the pastor records a consideration note
 *                     (≥ `CONTRA_SCAN_NOTE_MIN_CHARS`) OR overrides with a
 *                     justification (≥ `CONTRA_SCAN_OVERRIDE_MIN_CHARS`).
 *                     There is NO hard-block: a small/homogeneous library must
 *                     never trap a legitimate publish.
 *
 * Pure — no I/O, no clock. The application service stamps `consideredAt` /
 * `overriddenAt` and persists the report.
 */

import {
    CONTRA_SCAN_NOTE_MIN_CHARS,
    CONTRA_SCAN_OVERRIDE_MIN_CHARS,
    type ContraScanStatus,
} from '../entities/ContraScanReport';

/** What the pastor supplies to clear a soft-block — exactly one of these. */
export interface ContraScanClearInput {
    /** A consideration note engaging a dissenting chunk. */
    consideration?: { chunkId: string; note: string };
    /** An override justification (proceed without engaging a specific chunk). */
    override?: { reason: string; overriddenBy: string };
}

export type ContraScanGateReason =
    /** No dissent surfaced — nothing to confront. */
    | 'no-dissent'
    /** A valid consideration or override is present. */
    | 'considered'
    /** Soft-block, nothing supplied yet. */
    | 'needs-consideration'
    /** Consideration note supplied but too short. */
    | 'note-too-short'
    /** Override justification supplied but too short. */
    | 'override-too-short';

export type ContraScanGateDecision =
    | { allowed: true; reason: Extract<ContraScanGateReason, 'no-dissent' | 'considered'> }
    | {
          allowed: false;
          reason: Extract<
              ContraScanGateReason,
              'needs-consideration' | 'note-too-short' | 'override-too-short'
          >;
      };

/**
 * Thrown by the application service when the contra-scan gate refuses publish.
 * Carries the machine-readable `reason` so the UI renders the right copy
 * without string-matching `error.message`.
 */
export class ContraScanGateError extends Error {
    constructor(public readonly reason: ContraScanGateReason) {
        super(`Contra-scan gate refused publish: ${reason}`);
        this.name = 'ContraScanGateError';
        Object.setPrototypeOf(this, ContraScanGateError.prototype);
    }
}

function trimmedLength(value: string | undefined): number {
    return (value ?? '').trim().length;
}

/**
 * Decide whether a sermon may publish given its contra-scan status and the
 * pastor's optional response. Pure. The caller runs the scan beforehand so
 * `status` is fresh, and persists the consideration/override when this
 * returns `considered`.
 */
export function evaluateContraScanGate(
    status: ContraScanStatus,
    clear?: ContraScanClearInput,
): ContraScanGateDecision {
    if (status === 'no-dissent') {
        return { allowed: true, reason: 'no-dissent' };
    }
    if (status === 'pass') {
        return { allowed: true, reason: 'considered' };
    }

    // soft-block — needs a consideration note or an override.
    if (clear?.consideration) {
        if (trimmedLength(clear.consideration.note) < CONTRA_SCAN_NOTE_MIN_CHARS) {
            return { allowed: false, reason: 'note-too-short' };
        }
        return { allowed: true, reason: 'considered' };
    }
    if (clear?.override) {
        if (trimmedLength(clear.override.reason) < CONTRA_SCAN_OVERRIDE_MIN_CHARS) {
            return { allowed: false, reason: 'override-too-short' };
        }
        return { allowed: true, reason: 'considered' };
    }
    return { allowed: false, reason: 'needs-consideration' };
}
