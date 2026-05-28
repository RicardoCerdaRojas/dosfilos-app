import { describe, it, expect } from 'vitest';
import { createEmptyPastoralSeed, type PastoralSeed } from '../PastoralSeed';
import {
    computeStudyDepthFromSeed,
    coverageState,
    DIMENSION_ORDER,
    WEAK_DIMENSION_THRESHOLD,
} from '../StudyDepthAssessment';

function seed(overrides: Partial<PastoralSeed> = {}): PastoralSeed {
    const base = createEmptyPastoralSeed({
        id: 'seed-1',
        sermonId: 'sermon-1',
        userId: 'user-1',
        passage: 'Juan 1:1',
        now: new Date('2026-05-27T00:00:00Z'),
    });
    return { ...base, ...overrides };
}

const longText = (n: number) => 'x'.repeat(n);

describe('coverageState bands', () => {
    it('maps score to qualitative state', () => {
        expect(coverageState(0)).toBe('untouched');
        expect(coverageState(20)).toBe('started');
        expect(coverageState(60)).toBe('covered');
        expect(coverageState(74)).toBe('covered');
        expect(coverageState(75)).toBe('deep');
        expect(coverageState(100)).toBe('deep');
    });
});

describe('computeStudyDepthFromSeed', () => {
    it('an empty seed scores 0 everywhere and all dims are weak', () => {
        const a = computeStudyDepthFromSeed(seed());
        expect(a.overallScore).toBe(0);
        expect(a.weakDimensions).toEqual([...DIMENSION_ORDER]);
        for (const id of DIMENSION_ORDER) {
            expect(a.dimensions[id].score).toBe(0);
            expect(a.dimensions[id].state).toBe('untouched');
            expect(a.dimensions[id].evidenceCount).toBe(0);
        }
    });

    it('meeting the wizard minimum lands a dimension in the "covered" band', () => {
        // D1 = reading.firstImpression ≥ 50 chars
        const a = computeStudyDepthFromSeed(
            seed({ reading: { firstImpression: longText(50), timeSpentSeconds: 0 } }),
        );
        expect(a.dimensions.D1_lectura.score).toBeGreaterThanOrEqual(60);
        expect(a.dimensions.D1_lectura.state).toBe('covered');
        expect(a.dimensions.D1_lectura.score).toBeLessThan(75);
    });

    it('deeper work pushes a dimension into the "deep" band', () => {
        const a = computeStudyDepthFromSeed(
            seed({ reading: { firstImpression: longText(260), originalTextConsulted: true, timeSpentSeconds: 0 } }),
        );
        expect(a.dimensions.D1_lectura.score).toBeGreaterThanOrEqual(75);
        expect(a.dimensions.D1_lectura.state).toBe('deep');
    });

    it('D4 rewards word-study count + discovery quality', () => {
        const studies = [
            { word: 'λόγος', reference: 'Jn 1:1', pastorDiscovery: longText(40) },
            { word: 'ἀρχή', reference: 'Jn 1:1', pastorDiscovery: longText(40) },
        ];
        const a = computeStudyDepthFromSeed(seed({ wordStudies: { studies, timeSpentSeconds: 0 } }));
        expect(a.dimensions.D4_palabras.score).toBeGreaterThanOrEqual(60);
        expect(a.dimensions.D4_palabras.evidenceCount).toBe(2);
    });

    it('weakDimensions are sorted ascending by score and exclude covered dims', () => {
        const a = computeStudyDepthFromSeed(
            seed({ reading: { firstImpression: longText(260), originalTextConsulted: true, timeSpentSeconds: 0 } }),
        );
        expect(a.weakDimensions).not.toContain('D1_lectura');
        for (let i = 1; i < a.weakDimensions.length; i++) {
            const prev = a.dimensions[a.weakDimensions[i - 1]].score;
            const cur = a.dimensions[a.weakDimensions[i]].score;
            expect(prev).toBeLessThanOrEqual(cur);
        }
        a.weakDimensions.forEach((id) => expect(a.dimensions[id].score).toBeLessThan(WEAK_DIMENSION_THRESHOLD));
    });

    it('a per-dim manual override floors the score into "covered"', () => {
        const a = computeStudyDepthFromSeed(seed(), { D5_reconocimiento: { pastorMarkedComplete: true } });
        expect(a.dimensions.D5_reconocimiento.score).toBeGreaterThanOrEqual(60);
        expect(a.dimensions.D5_reconocimiento.pastorMarkedComplete).toBe(true);
        expect(a.weakDimensions).not.toContain('D5_reconocimiento');
        // override does not leak to other dims
        expect(a.dimensions.D1_lectura.pastorMarkedComplete).toBeUndefined();
    });

    it('override never lowers a genuinely higher score', () => {
        const deepReading = seed({
            reading: { firstImpression: longText(260), originalTextConsulted: true, timeSpentSeconds: 0 },
        });
        const a = computeStudyDepthFromSeed(deepReading, { D1_lectura: { pastorMarkedComplete: true } });
        expect(a.dimensions.D1_lectura.score).toBeGreaterThanOrEqual(75);
    });
});
