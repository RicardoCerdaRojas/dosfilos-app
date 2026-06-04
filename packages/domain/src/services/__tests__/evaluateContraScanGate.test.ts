/**
 * Tests for the Phase 4 PR 1 (ADR-033) pure contra-scan gate decision.
 *
 * Policy pinned here:
 *  - no-dissent  → allowed ('no-dissent') — nothing in the library to confront
 *  - pass        → allowed ('considered') — a consideration/override is present
 *  - soft-block + nothing            → blocked ('needs-consideration')
 *  - soft-block + short note         → blocked ('note-too-short')
 *  - soft-block + valid note         → allowed ('considered')
 *  - soft-block + short override     → blocked ('override-too-short')
 *  - soft-block + valid override     → allowed ('considered')
 *  - NO hard-block exists (small/homogeneous library never traps publish)
 */

import { describe, expect, it } from 'vitest';
import {
    CONTRA_SCAN_NOTE_MIN_CHARS,
    CONTRA_SCAN_OVERRIDE_MIN_CHARS,
    deriveContraScanStatus,
    type DissentingChunk,
} from '../../entities/ContraScanReport';
import { evaluateContraScanGate } from '../evaluateContraScanGate';

const validNote = 'x'.repeat(CONTRA_SCAN_NOTE_MIN_CHARS);
const validReason = 'y'.repeat(CONTRA_SCAN_OVERRIDE_MIN_CHARS);

const chunk: DissentingChunk = {
    chunkId: 'c1',
    resourceId: 'r1',
    resourceTitle: 'Commentary',
    resourceAuthor: 'Author',
    excerpt: 'A dissenting position…',
    tension: 'Argues the opposite of the central idea.',
    score: 0.7,
    fromPersonalLibrary: true,
};

describe('evaluateContraScanGate', () => {
    it('allows publish when no dissent surfaced', () => {
        expect(evaluateContraScanGate('no-dissent')).toEqual({
            allowed: true,
            reason: 'no-dissent',
        });
    });

    it('allows publish when status is already pass', () => {
        expect(evaluateContraScanGate('pass')).toEqual({ allowed: true, reason: 'considered' });
    });

    it('blocks a soft-block with nothing supplied', () => {
        expect(evaluateContraScanGate('soft-block')).toEqual({
            allowed: false,
            reason: 'needs-consideration',
        });
    });

    it('blocks a soft-block when the note is too short', () => {
        expect(
            evaluateContraScanGate('soft-block', {
                consideration: { chunkId: 'c1', note: 'too short' },
            }),
        ).toEqual({ allowed: false, reason: 'note-too-short' });
    });

    it('blocks a note that is whitespace-padded but under the bar', () => {
        const padded = `   ${'x'.repeat(CONTRA_SCAN_NOTE_MIN_CHARS - 1)}   `;
        expect(
            evaluateContraScanGate('soft-block', {
                consideration: { chunkId: 'c1', note: padded },
            }),
        ).toEqual({ allowed: false, reason: 'note-too-short' });
    });

    it('allows a soft-block cleared by a valid consideration note', () => {
        expect(
            evaluateContraScanGate('soft-block', {
                consideration: { chunkId: 'c1', note: validNote },
            }),
        ).toEqual({ allowed: true, reason: 'considered' });
    });

    it('blocks a soft-block when the override justification is too short', () => {
        expect(
            evaluateContraScanGate('soft-block', {
                override: { reason: 'nope', overriddenBy: 'pastor-1' },
            }),
        ).toEqual({ allowed: false, reason: 'override-too-short' });
    });

    it('allows a soft-block cleared by a valid override', () => {
        expect(
            evaluateContraScanGate('soft-block', {
                override: { reason: validReason, overriddenBy: 'pastor-1' },
            }),
        ).toEqual({ allowed: true, reason: 'considered' });
    });
});

describe('deriveContraScanStatus', () => {
    it('is no-dissent with an empty chunk list', () => {
        expect(deriveContraScanStatus([])).toBe('no-dissent');
    });

    it('is soft-block with dissent and no response', () => {
        expect(deriveContraScanStatus([chunk])).toBe('soft-block');
    });

    it('is pass with dissent and a consideration', () => {
        expect(
            deriveContraScanStatus([chunk], {
                chunkId: 'c1',
                note: validNote,
                consideredAt: new Date(0),
            }),
        ).toBe('pass');
    });

    it('is pass with dissent and an override', () => {
        expect(
            deriveContraScanStatus([chunk], undefined, {
                reason: validReason,
                overriddenBy: 'pastor-1',
                overriddenAt: new Date(0),
            }),
        ).toBe('pass');
    });
});
