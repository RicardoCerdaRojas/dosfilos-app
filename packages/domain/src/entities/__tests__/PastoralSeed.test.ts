import { describe, it, expect } from 'vitest';
import {
    createEmptyPastoralSeed,
    evaluatePastoralSeed,
    PASTORAL_SEED_AI_FORBIDDEN_FIELDS,
    PASTORAL_SEED_STEP_ORDER,
    validateInsight,
    validateMorphology,
    validateReading,
    validateRecognition,
} from '../PastoralSeed';

function buildCompleteSeed() {
    const seed = createEmptyPastoralSeed({
        id: 'seed-1',
        sermonId: 'sermon-1',
        userId: 'user-1',
        passage: 'Romanos 8:1-4',
    });
    seed.reading.firstImpression = 'A'.repeat(60);
    seed.syntax.mainClause.reference = 'Romanos 8:1';
    seed.syntax.mainClause.pastorNote = 'A'.repeat(40);
    seed.morphology.wordStudies = [
        { word: 'δικαιοσύνη', reference: 'Rom 8:4', pastorDiscovery: 'A'.repeat(35) },
        { word: 'σάρξ', reference: 'Rom 8:3', pastorDiscovery: 'A'.repeat(35) },
    ];
    seed.recognition.parallels = [
        { reference: 'Galatas 5:1', relevanceNote: 'A'.repeat(35), source: 'pastor-suggested' },
    ];
    seed.function.originalAudienceFunction = 'A'.repeat(120);
    seed.insight.centralIdea = 'A'.repeat(40);
    seed.insight.observations = ['A'.repeat(50), 'A'.repeat(50), 'A'.repeat(50)];
    seed.insight.openQuestion = 'A'.repeat(40);
    seed.insight.pastoralAnecdote = 'A'.repeat(90);
    seed.insight.doxologicalApplication = 'A'.repeat(90);
    return seed;
}

describe('PastoralSeed validators', () => {
    it('createEmptyPastoralSeed returns an incomplete seed', () => {
        const seed = createEmptyPastoralSeed({
            id: 'x',
            sermonId: 's',
            userId: 'u',
            passage: 'Juan 1:1',
        });
        expect(seed.completed).toBe(false);
        expect(seed.insight.observations).toEqual([]);
        expect(seed.morphology.wordStudies).toEqual([]);
    });

    it('validateReading enforces ≥50 chars on firstImpression', () => {
        expect(validateReading({ firstImpression: 'too short', timeSpentSeconds: 0 }).valid).toBe(false);
        expect(validateReading({ firstImpression: 'A'.repeat(60), timeSpentSeconds: 0 }).valid).toBe(true);
    });

    it('validateMorphology requires ≥2 word studies with discovery ≥30 chars each', () => {
        const tooFew = validateMorphology({
            wordStudies: [{ word: 'X', reference: 'Y', pastorDiscovery: 'A'.repeat(50) }],
            timeSpentSeconds: 0,
        });
        expect(tooFew.valid).toBe(false);

        const tooShort = validateMorphology({
            wordStudies: [
                { word: 'X', reference: 'Y', pastorDiscovery: 'short' },
                { word: 'Z', reference: 'W', pastorDiscovery: 'A'.repeat(50) },
            ],
            timeSpentSeconds: 0,
        });
        expect(tooShort.valid).toBe(false);

        const ok = validateMorphology({
            wordStudies: [
                { word: 'X', reference: 'Y', pastorDiscovery: 'A'.repeat(35) },
                { word: 'Z', reference: 'W', pastorDiscovery: 'A'.repeat(35) },
            ],
            timeSpentSeconds: 0,
        });
        expect(ok.valid).toBe(true);
    });

    it('validateRecognition rejects parallels with short relevance notes', () => {
        const bad = validateRecognition({
            parallels: [{ reference: 'X', relevanceNote: 'short', source: 'pastor-suggested' }],
            timeSpentSeconds: 0,
        });
        expect(bad.valid).toBe(false);
    });

    it('validateInsight rejects when any of the 5 fields is short', () => {
        const seed = buildCompleteSeed();
        const ok = validateInsight(seed.insight);
        expect(ok.valid).toBe(true);

        const seedShortDoxo = buildCompleteSeed();
        seedShortDoxo.insight.doxologicalApplication = 'short';
        expect(validateInsight(seedShortDoxo.insight).valid).toBe(false);
    });

    it('evaluatePastoralSeed marks the seed completed when every step passes', () => {
        const seed = buildCompleteSeed();
        const evaluation = evaluatePastoralSeed(seed);
        expect(evaluation.completed).toBe(true);
        expect(evaluation.completedSteps).toEqual(PASTORAL_SEED_STEP_ORDER);
    });

    it('evaluatePastoralSeed surfaces reasons per step on partial seeds', () => {
        const seed = createEmptyPastoralSeed({
            id: 'x',
            sermonId: 's',
            userId: 'u',
            passage: 'Juan 1:1',
        });
        const evaluation = evaluatePastoralSeed(seed);
        expect(evaluation.completed).toBe(false);
        expect(evaluation.perStep.reading.valid).toBe(false);
        expect(evaluation.perStep.insight.valid).toBe(false);
        expect(evaluation.perStep.reading.reasons[0]).toMatch(/Primera impresión/);
    });

    it('exposes the AI-forbidden field list for downstream guards', () => {
        expect(PASTORAL_SEED_AI_FORBIDDEN_FIELDS).toContain('insight.centralIdea');
        expect(PASTORAL_SEED_AI_FORBIDDEN_FIELDS).toContain('insight.doxologicalApplication');
    });
});
