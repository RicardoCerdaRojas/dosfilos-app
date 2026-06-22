import { describe, it, expect } from 'vitest';
import { decideMisreadingTurn, misreadingOutcomeAdvances } from '../misreadingTurn';
import { MISREADING_ENGAGEMENT_CORPUS } from './misreadingEngagementCorpus';

describe('decideMisreadingTurn — corpus dorado A/B/C/D (CA3)', () => {
    for (const c of MISREADING_ENGAGEMENT_CORPUS) {
        it(`fila ${c.row}: ${c.name} → ${c.expectedOutcome}`, () => {
            expect(decideMisreadingTurn(c.judgment, c.attemptIndex, c.cap)).toBe(c.expectedOutcome);
        });
    }
});

describe('garantía de la tesis: juzga engagement, no corrección', () => {
    const A = MISREADING_ENGAGEMENT_CORPUS.find((c) => c.row === 'A')!;
    const D1 = MISREADING_ENGAGEMENT_CORPUS.find((c) => c.row === 'D-1')!;
    const Df = MISREADING_ENGAGEMENT_CORPUS.find((c) => c.row === 'D-final')!;

    it('A y D difieren SOLO en contradictsAnchor', () => {
        expect(A.judgment.substantive).toBe(D1.judgment.substantive);
        expect(A.judgment.engagedAnchor).toBe(D1.judgment.engagedAnchor);
        expect(A.judgment.contradictsAnchor).not.toBe(D1.judgment.contradictsAnchor);
    });

    it('ambas terminan ACEPTANDO (D vía override) → no se juzga corrección', () => {
        expect(misreadingOutcomeAdvances(decideMisreadingTurn(A.judgment, A.attemptIndex, A.cap))).toBe(true);
        expect(misreadingOutcomeAdvances(decideMisreadingTurn(Df.judgment, Df.attemptIndex, Df.cap))).toBe(true);
    });

    it('si juzgara corrección, D nunca aceptaría — aquí D-final acepta (override floor)', () => {
        expect(decideMisreadingTurn(Df.judgment, Df.attemptIndex, Df.cap)).toBe('accept-override');
    });

    it('B (ignoró ancla) NO avanza en su primera ronda; difiere de D solo en engagedAnchor', () => {
        const B = MISREADING_ENGAGEMENT_CORPUS.find((c) => c.row === 'B')!;
        expect(B.judgment.engagedAnchor).not.toBe(D1.judgment.engagedAnchor);
        expect(misreadingOutcomeAdvances(decideMisreadingTurn(B.judgment, 0, 1))).toBe(false);
    });
});

describe('caso ortogonal: respondió sin tocar la mala lectura → NO se confronta', () => {
    it('!engaged + !contradice → accept (no re-confront): no encierra al pastor', () => {
        // Con el código de tres-estados, !contradice ⇒ accept aunque !engaged.
        expect(
            decideMisreadingTurn({ substantive: true, engagedAnchor: false, contradictsAnchor: false }, 0, 1),
        ).toBe('accept');
    });

    it('distingue ortogonal (no tocó) de B (tocó-e-ignoró): B contradice → re-confront', () => {
        const ortogonal = decideMisreadingTurn({ substantive: true, engagedAnchor: false, contradictsAnchor: false }, 0, 1);
        const b = decideMisreadingTurn({ substantive: true, engagedAnchor: false, contradictsAnchor: true }, 0, 1);
        expect(ortogonal).toBe('accept');
        expect(b).toBe('re-confront');
    });
});

describe('tope=0 (theological-tension): nunca re-confronta', () => {
    it('engaged + contradice con cap 0 → acepta directo (override), nunca re-confront', () => {
        const out = decideMisreadingTurn(
            { substantive: true, engagedAnchor: true, contradictsAnchor: true },
            0,
            0,
        );
        expect(out).toBe('accept-override');
    });
});
