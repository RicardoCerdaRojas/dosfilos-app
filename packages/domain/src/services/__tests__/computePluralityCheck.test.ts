/**
 * Tests for the Phase 3 PR 3 (ADR-029 §Q4) pure plurality check.
 *
 * Rules pinned here:
 *  - core/distinctive claim with < 2 distinct passages → failure
 *  - core/distinctive claim with ≥ 2 distinct passages → ok
 *  - open-evangelical claims are exempt (never fail, even with 0 passages)
 *  - duplicate passages collapse to one witness (book+chapter+verse)
 *  - substantiveClaims always echoes the full input
 */

import { describe, expect, it } from 'vitest';
import type { PassageRef, SubstantiveClaim } from '../../entities/FidelityReport';
import { computePluralityCheck } from '../computePluralityCheck';

function ref(label: string, book: string, chapter: number, verseStart?: number): PassageRef {
    return { label, book, chapter, verseStart };
}

function claim(
    detectedLevel: SubstantiveClaim['detectedLevel'],
    passages: PassageRef[],
    claimText = 'claim',
): SubstantiveClaim {
    return { claimText, detectedLevel, biblicalSources: passages };
}

describe('computePluralityCheck', () => {
    it('flags a core claim grounded on a single passage', () => {
        const c = claim('core', [ref('Juan 1:1', 'Juan', 1, 1)]);
        const report = computePluralityCheck([c]);
        expect(report.failures).toEqual([c]);
        expect(report.substantiveClaims).toEqual([c]);
    });

    it('passes a core claim grounded on two distinct passages', () => {
        const c = claim('core', [
            ref('Juan 1:1', 'Juan', 1, 1),
            ref('Colosenses 1:16', 'Colosenses', 1, 16),
        ]);
        expect(computePluralityCheck([c]).failures).toEqual([]);
    });

    it('flags a distinctive claim with one passage', () => {
        const c = claim('distinctive', [ref('Hechos 2:38', 'Hechos', 2, 38)]);
        expect(computePluralityCheck([c]).failures).toEqual([c]);
    });

    it('exempts open-evangelical claims even with zero passages', () => {
        const c = claim('open-evangelical', []);
        expect(computePluralityCheck([c]).failures).toEqual([]);
    });

    it('collapses duplicate passages to a single witness', () => {
        const c = claim('core', [
            ref('Juan 1:1', 'Juan', 1, 1),
            ref('Juan 1:1', 'Juan', 1, 1),
        ]);
        expect(computePluralityCheck([c]).failures).toEqual([c]);
    });

    it('treats same book+chapter different verse as distinct witnesses', () => {
        const c = claim('core', [
            ref('Juan 1:1', 'Juan', 1, 1),
            ref('Juan 1:14', 'Juan', 1, 14),
        ]);
        expect(computePluralityCheck([c]).failures).toEqual([]);
    });

    it('falls back to label distinctness when structured fields are missing', () => {
        const c = claim('core', [
            { label: 'Salmo 110', book: '', chapter: NaN },
            { label: 'Hebreos 1:3', book: '', chapter: NaN },
        ]);
        expect(computePluralityCheck([c]).failures).toEqual([]);
    });

    it('returns no failures for an empty claim list', () => {
        expect(computePluralityCheck([])).toEqual({ substantiveClaims: [], failures: [] });
    });
});
