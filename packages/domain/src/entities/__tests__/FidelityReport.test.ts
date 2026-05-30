/**
 * Tests for the Phase 3 FidelityReport entity (ADR-029).
 *
 * Pins the pure helpers consumed by the evaluator callable + the editor
 * panel: `extractClaimForMarker` (Q2 — sentence-before-marker) and the
 * factory `buildEmptyFidelityReport` (PR 1 — used when the manifest has
 * zero entries so the panel still has a stable shape to render).
 */

import { describe, expect, it } from 'vitest';
import {
    buildEmptyFidelityReport,
    extractClaimForMarker,
    FIDELITY_OVERRIDE_MIN_CHARS,
    FIDELITY_REPORT_VERSION,
    type FidelityVerdict,
} from '../FidelityReport';

describe('extractClaimForMarker (Q2 — sentence right before [N])', () => {
    it('extracts the sentence immediately preceding a single-number marker', () => {
        const prose = 'Cristo es preexistente. [1]';
        expect(extractClaimForMarker(prose, 1)).toBe('Cristo es preexistente.');
    });

    it('returns the IMMEDIATELY preceding sentence when multiple sentences exist', () => {
        const prose = 'Primero esto. Después aquello. [2]';
        expect(extractClaimForMarker(prose, 2)).toBe('Después aquello.');
    });

    it('finds the marker inside multi-marker syntax `[1, 3]`', () => {
        const prose = 'Una afirmación importante. [1, 3] y luego sigue.';
        expect(extractClaimForMarker(prose, 3)).toBe('Una afirmación importante.');
    });

    it('finds the marker inside multi-marker syntax `[2,5]` (no whitespace)', () => {
        const prose = 'Otra afirmación. [2,5]';
        expect(extractClaimForMarker(prose, 5)).toBe('Otra afirmación.');
    });

    it('handles question marks as sentence terminator', () => {
        const prose = '¿Es esto realmente verdad? [1]';
        expect(extractClaimForMarker(prose, 1)).toBe('¿Es esto realmente verdad?');
    });

    it('handles exclamation marks as sentence terminator', () => {
        const prose = '¡Esto es asombroso! [1]';
        expect(extractClaimForMarker(prose, 1)).toBe('¡Esto es asombroso!');
    });

    it('handles newlines between the claim and the marker', () => {
        const prose = 'Una afirmación.\n\n[1]';
        expect(extractClaimForMarker(prose, 1)).toBe('Una afirmación.');
    });

    it('trims leading/trailing whitespace from the extracted claim', () => {
        const prose = '   Una afirmación con espacio.    [1]';
        expect(extractClaimForMarker(prose, 1)).toBe('Una afirmación con espacio.');
    });

    it('returns null when the marker number is absent from the prose', () => {
        const prose = 'Solo texto sin marcador alguno.';
        expect(extractClaimForMarker(prose, 1)).toBeNull();
    });

    it('returns null when the marker exists but is followed by a different number', () => {
        const prose = 'Una afirmación. [2]';
        expect(extractClaimForMarker(prose, 1)).toBeNull();
    });

    it('returns null when no sentence precedes the marker', () => {
        const prose = '[1] Texto después del marcador.';
        expect(extractClaimForMarker(prose, 1)).toBeNull();
    });

    it('picks the correct marker when the same number appears in two places', () => {
        // First occurrence wins — pastoral fidelity uses the first claim
        // a marker was attached to (later edits invalidate via `stale`).
        const prose = 'Primer claim. [1] Segundo claim. [1]';
        expect(extractClaimForMarker(prose, 1)).toBe('Primer claim.');
    });

    it('ignores false-positive numeric tokens like `[abc]` or `1, 2`', () => {
        const prose = 'Texto con [abc] y números 1, 2 sin corchetes. Después claim real. [1]';
        expect(extractClaimForMarker(prose, 1)).toBe('Después claim real.');
    });
});

describe('buildEmptyFidelityReport (PR 1 factory)', () => {
    it('returns a stable shape with zero verdicts and a pass gateStatus', () => {
        const now = new Date('2026-05-30T12:00:00Z');
        const report = buildEmptyFidelityReport({
            reportId: 'rep-1',
            sermonId: 'sermon-1',
            generatedAt: now,
        });

        expect(report.version).toBe(FIDELITY_REPORT_VERSION);
        expect(report.reportId).toBe('rep-1');
        expect(report.sermonId).toBe('sermon-1');
        expect(report.generatedAt).toEqual(now);
        expect(report.modelTier).toBe('flash');
        expect(report.verdicts).toEqual([]);
        expect(report.summary).toEqual({
            supports: 0,
            partial: 0,
            unrelated: 0,
            contradicts: 0,
            totalMarkers: 0,
            unrelatedRatio: 0,
            partialRatio: 0,
        });
        expect(report.gateStatus).toBe('pass');
        expect(report.gateOverride).toBeUndefined();
        expect(report.pluralityReport).toBeUndefined();
        expect(report.attributionReport).toBeUndefined();
        expect(report.authorityReport).toBeUndefined();
    });
});

describe('FIDELITY_OVERRIDE_MIN_CHARS (Q3 — override policy)', () => {
    it('exports the documented 100-char minimum', () => {
        // ADR-029 + ADR-027 both pin this value. If we ever raise it,
        // update both ADRs and the UI textarea minLength prop.
        expect(FIDELITY_OVERRIDE_MIN_CHARS).toBe(100);
    });
});

describe('FidelityVerdict shape (compile-time invariants)', () => {
    it('accepts the four documented verdict kinds + flash/sonnet model labels', () => {
        // Compile-time pin: if the type changes the test stops compiling.
        const v: FidelityVerdict = {
            marker: 1,
            claim: 'Cristo es preexistente.',
            citedSource: {
                sourceId: 'S1',
                resourceId: 'res-abc',
                chunkId: 'ch-1',
                title: 'Westminster Confession of Faith',
                excerpt: 'In the beginning was the Word.',
            },
            verdict: 'supports',
            reasoning: 'The chunk explicitly affirms the preexistence claim.',
            confidence: 0.92,
            modelUsed: 'flash',
            evaluatedAt: new Date('2026-05-30T12:00:00Z'),
        };
        expect(v.marker).toBe(1);

        const escalated: FidelityVerdict = { ...v, verdict: 'partial', modelUsed: 'sonnet' };
        expect(escalated.modelUsed).toBe('sonnet');

        const negative: FidelityVerdict = { ...v, verdict: 'contradicts' };
        expect(negative.verdict).toBe('contradicts');

        const off: FidelityVerdict = { ...v, verdict: 'unrelated', stale: true };
        expect(off.stale).toBe(true);
    });
});
