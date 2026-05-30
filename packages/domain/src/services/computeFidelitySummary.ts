/**
 * Phase 3 (ADR-029) — pure gate policy.
 *
 * Given a list of `FidelityVerdict`s + optional sub-report failure flags
 * (PR 3/4/5), derive the summary counts the panel renders and the
 * `gateStatus` the pre-publish gate enforces.
 *
 * Pure — no I/O, no clock, no randomness. Pinned by unit tests
 * (`__tests__/computeFidelitySummary.test.ts`).
 *
 * Thresholds (Q3, ADR-029):
 *   - unrelatedRatio  > 0.20  → hard-block (no override; ADR-029 §Q3).
 *   - partialRatio    > 0.10  → soft-block (override path with ≥100 chars).
 *   - any sub-report failure  → soft-block.
 *   - hard-block always wins over soft-block.
 *
 * Cache invalidation (Q6): stale verdicts are EXCLUDED from the gate
 * ratios. The UI still renders them so the pastor can see the historical
 * evaluation, but they cannot block publish — re-running the pass flips
 * `stale` off for any markers whose claim changed.
 */

import type {
    FidelityGateStatus,
    FidelitySummary,
    FidelityVerdict,
} from '../entities/FidelityReport';

/** Strict greater-than threshold for the hard-block. ADR-029 §Q3. */
export const FIDELITY_HARD_BLOCK_RATIO = 0.2;

/** Strict greater-than threshold for the partial soft-block. ADR-029 §Q3. */
export const FIDELITY_SOFT_BLOCK_PARTIAL_RATIO = 0.1;

export interface FidelityGateInput {
    verdicts: FidelityVerdict[];
    /** PR 3 hook — Plurality validator emits a failure. */
    pluralityHasFailures?: boolean;
    /** PR 4 hook — Authority detector found a subordination violation. */
    authorityHasViolations?: boolean;
    /** PR 5 hook — required attribution missing from the rendered output. */
    attributionHasMissing?: boolean;
}

export interface FidelityGateOutput {
    summary: FidelitySummary;
    gateStatus: FidelityGateStatus;
}

/**
 * Compute the gate summary + status. Pure. See file header for the
 * threshold + precedence rules.
 */
export function computeFidelitySummary(input: FidelityGateInput): FidelityGateOutput {
    const summary: FidelitySummary = {
        supports: 0,
        partial: 0,
        unrelated: 0,
        contradicts: 0,
        totalMarkers: input.verdicts.length,
        unrelatedRatio: 0,
        partialRatio: 0,
    };

    let fresh = 0;
    let freshUnrelatedOrContradicts = 0;
    let freshPartial = 0;

    for (const v of input.verdicts) {
        switch (v.verdict) {
            case 'supports':
                summary.supports++;
                break;
            case 'partial':
                summary.partial++;
                break;
            case 'unrelated':
                summary.unrelated++;
                break;
            case 'contradicts':
                summary.contradicts++;
                break;
        }
        if (v.stale === true) continue;
        fresh++;
        if (v.verdict === 'unrelated' || v.verdict === 'contradicts') {
            freshUnrelatedOrContradicts++;
        } else if (v.verdict === 'partial') {
            freshPartial++;
        }
    }

    if (fresh > 0) {
        summary.unrelatedRatio = freshUnrelatedOrContradicts / fresh;
        summary.partialRatio = freshPartial / fresh;
    }

    const hardBlock = summary.unrelatedRatio > FIDELITY_HARD_BLOCK_RATIO;
    const softBlock =
        summary.partialRatio > FIDELITY_SOFT_BLOCK_PARTIAL_RATIO ||
        input.pluralityHasFailures === true ||
        input.authorityHasViolations === true ||
        input.attributionHasMissing === true;

    let gateStatus: FidelityGateStatus;
    if (hardBlock) gateStatus = 'hard-block';
    else if (softBlock) gateStatus = 'soft-block';
    else gateStatus = 'pass';

    return { summary, gateStatus };
}
