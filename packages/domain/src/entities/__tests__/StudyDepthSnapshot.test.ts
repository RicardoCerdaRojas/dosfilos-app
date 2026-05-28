import { describe, it, expect } from 'vitest';
import { createEmptyPastoralSeed, type PastoralSeed } from '../PastoralSeed';
import {
    buildStudyDepthSnapshot,
    computeExpertModeStatus,
    computeStudyDepthFromSeed,
    countExpertModeQualifyingSermons,
    EXPERT_MODE_GOOD_SCORE,
    EXPERT_MODE_UNLOCK_THRESHOLD,
    STUDY_DEPTH_OVERRIDE_MIN_CHARS,
    type StudyDepthSnapshot,
} from '../StudyDepthAssessment';

function seedFull(): PastoralSeed {
    const s = createEmptyPastoralSeed({
        id: 'seed-1',
        sermonId: 'srm-1',
        userId: 'u1',
        passage: 'Juan 1:1',
        now: new Date('2026-05-28T00:00:00Z'),
    });
    s.reading.firstImpression = 'a'.repeat(260);
    s.reading.originalTextConsulted = true;
    return s;
}

describe('buildStudyDepthSnapshot', () => {
    it('captures every dimension score + weak list + bypass info', () => {
        const a = computeStudyDepthFromSeed(seedFull());
        const snap = buildStudyDepthSnapshot(a, {
            bypassedConfrontation: true,
            justification: 'a'.repeat(STUDY_DEPTH_OVERRIDE_MIN_CHARS),
            expertMode: false,
        });
        expect(snap.overallScore).toBe(a.overallScore);
        expect(Object.keys(snap.dimensionScores).length).toBeGreaterThan(0);
        expect(snap.weakDimensions).toEqual(a.weakDimensions);
        expect(snap.bypassedConfrontation).toBe(true);
        expect(snap.justification?.length).toBe(STUDY_DEPTH_OVERRIDE_MIN_CHARS);
        expect(snap.expertMode).toBe(false);
        expect(snap.capturedAt).toBeInstanceOf(Date);
    });

    it('drops empty justification', () => {
        const a = computeStudyDepthFromSeed(seedFull());
        const snap = buildStudyDepthSnapshot(a, {
            bypassedConfrontation: false,
            justification: '   ',
            expertMode: false,
        });
        expect(snap.justification).toBeUndefined();
    });
});

describe('Expert mode unlock', () => {
    function snap(overrides: Partial<StudyDepthSnapshot> = {}): StudyDepthSnapshot {
        return {
            capturedAt: new Date(),
            overallScore: EXPERT_MODE_GOOD_SCORE,
            dimensionScores: {} as never,
            weakDimensions: [],
            bypassedConfrontation: false,
            expertMode: false,
            ...overrides,
        };
    }

    it('counts only high-score + non-bypassed sermons', () => {
        const sermons = [
            { studyDepthSnapshot: snap({ overallScore: 85 }) },
            { studyDepthSnapshot: snap({ overallScore: 72 }) },
            { studyDepthSnapshot: snap({ overallScore: 50 }) }, // too low
            { studyDepthSnapshot: snap({ overallScore: 90, bypassedConfrontation: true }) }, // bypassed
            {}, // no snapshot
        ];
        expect(countExpertModeQualifyingSermons(sermons)).toBe(2);
    });

    it('locks the toggle below threshold', () => {
        const status = computeExpertModeStatus({ expertModeOn: false }, EXPERT_MODE_UNLOCK_THRESHOLD - 1);
        expect(status.isUnlocked).toBe(false);
        expect(status.isOn).toBe(false);
        expect(status.reason).toBe('locked-below-threshold');
    });

    it('unlocks at or above threshold but stays off until toggled', () => {
        const status = computeExpertModeStatus({ expertModeOn: false }, EXPERT_MODE_UNLOCK_THRESHOLD);
        expect(status.isUnlocked).toBe(true);
        expect(status.isOn).toBe(false);
        expect(status.reason).toBe('unlocked-not-toggled');
    });

    it('honors super-admin force-on regardless of threshold', () => {
        const status = computeExpertModeStatus({ expertModeOn: true }, 0);
        expect(status.isOn).toBe(true);
        expect(status.isUnlocked).toBe(true);
        expect(status.reason).toBe('on');
    });
});
