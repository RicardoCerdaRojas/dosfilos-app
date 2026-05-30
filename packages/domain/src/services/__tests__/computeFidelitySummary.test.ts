/**
 * Tests for the Phase 3 (ADR-029) gate policy — the pure function that
 * derives the per-publish summary + gateStatus from a verdict list and the
 * optional sub-report flags (PR 3/4/5).
 *
 * Q3 thresholds pinned here:
 *  - unrelatedRatio > FIDELITY_HARD_BLOCK_RATIO          → hard-block
 *  - partialRatio   > FIDELITY_SOFT_BLOCK_PARTIAL_RATIO  → soft-block
 *  - any sub-report failure (plurality / authority / attribution) → soft
 *  - hard-block ALWAYS wins over soft-block
 *  - empty verdicts → 'pass'
 */

import { describe, expect, it } from 'vitest';
import type { FidelityVerdict, FidelityVerdictKind } from '../../entities/FidelityReport';
import {
    computeFidelitySummary,
    FIDELITY_HARD_BLOCK_RATIO,
    FIDELITY_SOFT_BLOCK_PARTIAL_RATIO,
} from '../computeFidelitySummary';

const REF_DATE = new Date('2026-05-30T12:00:00Z');

function verdict(marker: number, kind: FidelityVerdictKind, stale = false): FidelityVerdict {
    return {
        marker,
        claim: `claim ${marker}`,
        citedSource: {
            sourceId: `S${marker}`,
            resourceId: `res-${marker}`,
            chunkId: `ch-${marker}`,
            title: 'Test source',
            excerpt: 'snippet',
        },
        verdict: kind,
        reasoning: 'test',
        confidence: 0.9,
        modelUsed: 'flash',
        evaluatedAt: REF_DATE,
        ...(stale ? { stale: true } : {}),
    };
}

function make(kinds: Array<FidelityVerdictKind | [FidelityVerdictKind, true]>): FidelityVerdict[] {
    return kinds.map((k, idx) => {
        if (Array.isArray(k)) return verdict(idx + 1, k[0], true);
        return verdict(idx + 1, k);
    });
}

describe('computeFidelitySummary — empty inputs', () => {
    it('returns a zero summary + pass for an empty verdict list', () => {
        const out = computeFidelitySummary({ verdicts: [] });
        expect(out.summary).toEqual({
            supports: 0,
            partial: 0,
            unrelated: 0,
            contradicts: 0,
            totalMarkers: 0,
            unrelatedRatio: 0,
            partialRatio: 0,
        });
        expect(out.gateStatus).toBe('pass');
    });
});

describe('computeFidelitySummary — counting', () => {
    it('counts each verdict kind into its bucket', () => {
        const out = computeFidelitySummary({
            verdicts: make(['supports', 'partial', 'unrelated', 'contradicts', 'supports']),
        });
        expect(out.summary.supports).toBe(2);
        expect(out.summary.partial).toBe(1);
        expect(out.summary.unrelated).toBe(1);
        expect(out.summary.contradicts).toBe(1);
        expect(out.summary.totalMarkers).toBe(5);
    });

    it('combines unrelated + contradicts into unrelatedRatio', () => {
        const out = computeFidelitySummary({
            verdicts: make(['unrelated', 'contradicts', 'supports', 'supports', 'supports']),
        });
        // (1 unrelated + 1 contradicts) / 5 = 0.4
        expect(out.summary.unrelatedRatio).toBeCloseTo(0.4, 5);
    });

    it('computes partialRatio independently of the hard-block ratio', () => {
        const out = computeFidelitySummary({
            verdicts: make(['partial', 'partial', 'supports', 'supports', 'supports']),
        });
        expect(out.summary.partialRatio).toBeCloseTo(0.4, 5);
        expect(out.summary.unrelatedRatio).toBe(0);
    });

    it('excludes stale verdicts from the gate ratios so a stale failing verdict cannot block publish', () => {
        // Q6: stale verdicts persist for UI/audit but the gate ignores them
        // because the underlying marker text changed since evaluation.
        const out = computeFidelitySummary({
            verdicts: make([
                ['contradicts', true],
                ['contradicts', true],
                'supports',
            ]),
        });
        // 2 stale contradicts + 1 fresh supports → fresh = 1, ratio = 0
        expect(out.summary.totalMarkers).toBe(3);
        expect(out.summary.unrelatedRatio).toBe(0);
        expect(out.gateStatus).toBe('pass');
    });
});

describe('computeFidelitySummary — Q3 thresholds (hard-block)', () => {
    it('exports the documented hard-block ratio (20%)', () => {
        expect(FIDELITY_HARD_BLOCK_RATIO).toBeCloseTo(0.2, 5);
    });

    it('passes at exactly 20% unrelated (boundary is strict >)', () => {
        // 2 of 10 = 0.2; threshold check is `> 0.2` not `>= 0.2`.
        const verdicts: FidelityVerdict[] = make([
            'unrelated',
            'unrelated',
            'supports',
            'supports',
            'supports',
            'supports',
            'supports',
            'supports',
            'supports',
            'supports',
        ]);
        const out = computeFidelitySummary({ verdicts });
        expect(out.summary.unrelatedRatio).toBeCloseTo(0.2, 5);
        expect(out.gateStatus).toBe('pass');
    });

    it('hard-blocks when unrelatedRatio crosses 20%', () => {
        const verdicts: FidelityVerdict[] = make([
            'unrelated',
            'unrelated',
            'unrelated',
            'supports',
            'supports',
            'supports',
            'supports',
            'supports',
            'supports',
            'supports',
        ]);
        const out = computeFidelitySummary({ verdicts });
        expect(out.summary.unrelatedRatio).toBeCloseTo(0.3, 5);
        expect(out.gateStatus).toBe('hard-block');
    });

    it('hard-blocks when contradicts alone crosses the threshold', () => {
        const verdicts: FidelityVerdict[] = make([
            'contradicts',
            'contradicts',
            'contradicts',
            'supports',
            'supports',
            'supports',
            'supports',
            'supports',
            'supports',
            'supports',
        ]);
        const out = computeFidelitySummary({ verdicts });
        expect(out.gateStatus).toBe('hard-block');
    });
});

describe('computeFidelitySummary — Q3 thresholds (soft-block, partial)', () => {
    it('exports the documented soft-block partial ratio (10%)', () => {
        expect(FIDELITY_SOFT_BLOCK_PARTIAL_RATIO).toBeCloseTo(0.1, 5);
    });

    it('passes at exactly 10% partial (boundary is strict >)', () => {
        const verdicts: FidelityVerdict[] = make([
            'partial',
            'supports',
            'supports',
            'supports',
            'supports',
            'supports',
            'supports',
            'supports',
            'supports',
            'supports',
        ]);
        const out = computeFidelitySummary({ verdicts });
        expect(out.summary.partialRatio).toBeCloseTo(0.1, 5);
        expect(out.gateStatus).toBe('pass');
    });

    it('soft-blocks when partialRatio crosses 10%', () => {
        const verdicts: FidelityVerdict[] = make([
            'partial',
            'partial',
            'supports',
            'supports',
            'supports',
            'supports',
            'supports',
            'supports',
            'supports',
            'supports',
        ]);
        const out = computeFidelitySummary({ verdicts });
        expect(out.summary.partialRatio).toBeCloseTo(0.2, 5);
        expect(out.gateStatus).toBe('soft-block');
    });
});

describe('computeFidelitySummary — sub-report failures (PR 3/4/5 hooks)', () => {
    it('soft-blocks when plurality has failures even with all-supports verdicts', () => {
        const out = computeFidelitySummary({
            verdicts: make(['supports', 'supports', 'supports']),
            pluralityHasFailures: true,
        });
        expect(out.gateStatus).toBe('soft-block');
    });

    it('soft-blocks when authority has violations', () => {
        const out = computeFidelitySummary({
            verdicts: make(['supports', 'supports']),
            authorityHasViolations: true,
        });
        expect(out.gateStatus).toBe('soft-block');
    });

    it('soft-blocks when attribution has missing entries', () => {
        const out = computeFidelitySummary({
            verdicts: make(['supports']),
            attributionHasMissing: true,
        });
        expect(out.gateStatus).toBe('soft-block');
    });

    it('passes when sub-report flags are all false even on an empty manifest', () => {
        const out = computeFidelitySummary({
            verdicts: [],
            pluralityHasFailures: false,
            authorityHasViolations: false,
            attributionHasMissing: false,
        });
        expect(out.gateStatus).toBe('pass');
    });
});

describe('computeFidelitySummary — precedence', () => {
    it('hard-block always wins over a co-occurring soft-block', () => {
        const verdicts: FidelityVerdict[] = make([
            'unrelated',
            'unrelated',
            'unrelated',
            'partial',
            'partial',
            'supports',
            'supports',
            'supports',
            'supports',
            'supports',
        ]);
        const out = computeFidelitySummary({
            verdicts,
            pluralityHasFailures: true,
            authorityHasViolations: true,
            attributionHasMissing: true,
        });
        expect(out.summary.unrelatedRatio).toBeCloseTo(0.3, 5);
        expect(out.gateStatus).toBe('hard-block');
    });
});
