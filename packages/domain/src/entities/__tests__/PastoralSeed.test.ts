import { describe, it, expect } from 'vitest';
import {
    createEmptyPastoralSeed,
    evaluatePastoralSeed,
    PASTORAL_SEED_AI_FORBIDDEN_FIELDS,
    PASTOR_VOICE_STEPS,
    PASTORAL_SEED_STEP_ORDER,
    validateContextGenre,
    validateInsight,
    validateTimelessPrinciple,
    validateWordStudies,
    validateReading,
    validateRecognition,
} from '../PastoralSeed';
import {
    AI_ASSIST_FORBIDDEN_STEPS,
    assertAiAssistAllowed,
    isAiAssistAllowed,
} from '../AiAssistLog';

function buildCompleteSeed() {
    const seed = createEmptyPastoralSeed({
        id: 'seed-1',
        sermonId: 'sermon-1',
        userId: 'user-1',
        passage: 'Romanos 8:1-4',
    });
    seed.reading.firstImpression = 'A'.repeat(60);
    seed.contextGenre.genre = 'epistle';
    seed.contextGenre.genreConfirmed = true;
    seed.contextGenre.genreImplication = 'A'.repeat(70);
    seed.structuralAnalysis.mainClause.reference = 'Romanos 8:1';
    seed.structuralAnalysis.mainClause.pastorNote = 'A'.repeat(40);
    seed.wordStudies.studies = [
        { word: 'δικαιοσύνη', reference: 'Rom 8:4', pastorDiscovery: 'A'.repeat(35) },
        { word: 'σάρξ', reference: 'Rom 8:3', pastorDiscovery: 'A'.repeat(35) },
    ];
    seed.recognition.parallels = [
        { reference: 'Galatas 5:1', relevanceNote: 'A'.repeat(35), source: 'pastor-suggested' },
    ];
    seed.function.originalAudienceFunction = 'A'.repeat(120);
    seed.timelessPrinciple.principle = 'A'.repeat(70);
    seed.insight.centralIdea = 'A'.repeat(40);
    seed.insight.observations = ['A'.repeat(50), 'A'.repeat(50), 'A'.repeat(50)];
    seed.insight.openQuestion = 'A'.repeat(40);
    seed.insight.pastoralAnecdote = 'A'.repeat(90);
    seed.insight.doxologicalApplication = 'A'.repeat(90);
    return seed;
}

describe('PastoralSeed validators (eight-step spine)', () => {
    it('createEmptyPastoralSeed returns an incomplete seed', () => {
        const seed = createEmptyPastoralSeed({
            id: 'x',
            sermonId: 's',
            userId: 'u',
            passage: 'Juan 1:1',
        });
        expect(seed.completed).toBe(false);
        expect(seed.insight.observations).toEqual([]);
        expect(seed.wordStudies.studies).toEqual([]);
        expect(seed.contextGenre.genre).toBe('');
        expect(seed.timelessPrinciple.principle).toBe('');
    });

    it('PASTORAL_SEED_STEP_ORDER has the 8 steps in hermeneutical order', () => {
        expect(PASTORAL_SEED_STEP_ORDER).toEqual([
            'reading',
            'contextGenre',
            'structuralAnalysis',
            'wordStudies',
            'recognition',
            'function',
            'timelessPrinciple',
            'insight',
        ]);
    });

    it('validateReading enforces ≥50 chars on firstImpression', () => {
        expect(validateReading({ firstImpression: 'too short', timeSpentSeconds: 0 }).valid).toBe(false);
        expect(validateReading({ firstImpression: 'A'.repeat(60), timeSpentSeconds: 0 }).valid).toBe(true);
    });

    it('validateContextGenre requires a confirmed genre + ≥60-char implication', () => {
        const noGenre = validateContextGenre({
            genre: '',
            genreConfirmed: false,
            genreImplication: 'A'.repeat(70),
            bookLocationNote: '',
            historicalContextConsulted: false,
            timeSpentSeconds: 0,
        });
        expect(noGenre.valid).toBe(false);

        const unconfirmed = validateContextGenre({
            genre: 'epistle',
            genreConfirmed: false,
            genreImplication: 'A'.repeat(70),
            bookLocationNote: '',
            historicalContextConsulted: false,
            timeSpentSeconds: 0,
        });
        expect(unconfirmed.valid).toBe(false);

        const shortImpl = validateContextGenre({
            genre: 'epistle',
            genreConfirmed: true,
            genreImplication: 'short',
            bookLocationNote: '',
            historicalContextConsulted: false,
            timeSpentSeconds: 0,
        });
        expect(shortImpl.valid).toBe(false);

        const ok = validateContextGenre({
            genre: 'epistle',
            genreConfirmed: true,
            genreImplication: 'A'.repeat(70),
            bookLocationNote: '',
            historicalContextConsulted: false,
            timeSpentSeconds: 0,
        });
        expect(ok.valid).toBe(true);
    });

    it('validateWordStudies requires ≥2 word studies with discovery ≥30 chars each', () => {
        const tooFew = validateWordStudies({
            studies: [{ word: 'X', reference: 'Y', pastorDiscovery: 'A'.repeat(50) }],
            timeSpentSeconds: 0,
        });
        expect(tooFew.valid).toBe(false);

        const tooShort = validateWordStudies({
            studies: [
                { word: 'X', reference: 'Y', pastorDiscovery: 'short' },
                { word: 'Z', reference: 'W', pastorDiscovery: 'A'.repeat(50) },
            ],
            timeSpentSeconds: 0,
        });
        expect(tooShort.valid).toBe(false);

        const ok = validateWordStudies({
            studies: [
                { word: 'X', reference: 'Y', pastorDiscovery: 'A'.repeat(35) },
                { word: 'Z', reference: 'W', pastorDiscovery: 'A'.repeat(35) },
            ],
            timeSpentSeconds: 0,
        });
        expect(ok.valid).toBe(true);
    });

    it('validateTimelessPrinciple enforces ≥60 chars on the principle', () => {
        expect(validateTimelessPrinciple({ principle: 'short', timeSpentSeconds: 0 }).valid).toBe(false);
        expect(validateTimelessPrinciple({ principle: 'A'.repeat(70), timeSpentSeconds: 0 }).valid).toBe(true);
    });

    it('validateRecognition rejects parallels with short relevance notes', () => {
        const bad = validateRecognition({
            parallels: [{ reference: 'X', relevanceNote: 'short', source: 'pastor-suggested' }],
            timeSpentSeconds: 0,
        });
        expect(bad.valid).toBe(false);
    });

    it('R1/D2 — acepta 5 paralelos (el bloqueo original de 3 quedó eliminado)', () => {
        const note = 'a'.repeat(40);
        const five = Array.from({ length: 5 }, (_, i) => ({
            reference: `Ref ${i}`, relevanceNote: note, source: 'pastor-suggested' as const,
        }));
        expect(validateRecognition({ parallels: five, timeSpentSeconds: 0 }).valid).toBe(true);
    });

    it('R1/D2 — el techo de seguridad sigue: >8 paralelos rechaza', () => {
        const note = 'a'.repeat(40);
        const nine = Array.from({ length: 9 }, (_, i) => ({
            reference: `Ref ${i}`, relevanceNote: note, source: 'pastor-suggested' as const,
        }));
        const res = validateRecognition({ parallels: nine, timeSpentSeconds: 0 });
        expect(res.valid).toBe(false);
        expect(res.reasons.join(' ')).toContain('Máximo 8');
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
        expect(evaluation.perStep.contextGenre.valid).toBe(false);
        expect(evaluation.perStep.timelessPrinciple.valid).toBe(false);
        expect(evaluation.perStep.insight.valid).toBe(false);
        expect(evaluation.perStep.reading.reasons[0]).toMatch(/Primera impresión/);
    });

    it('exposes the AI-forbidden field list for downstream guards', () => {
        expect(PASTORAL_SEED_AI_FORBIDDEN_FIELDS).toContain('insight.centralIdea');
        expect(PASTORAL_SEED_AI_FORBIDDEN_FIELDS).toContain('insight.doxologicalApplication');
        expect(PASTORAL_SEED_AI_FORBIDDEN_FIELDS).toContain('timelessPrinciple.principle');
    });
});

describe('AiAssistLog step guard (ADR-024)', () => {
    // 2026-08-21: esta lista decía ['reading', 'insight'] y se había quedado sin
    // `timelessPrinciple`, que las políticas del chat SÍ tratan como voz del
    // pastor. Un assist de tier CONTENIDO podía registrarse ahí como legítimo y
    // la métrica "% tuyo" lo habría contado como voz del pastor. Ahora deriva
    // del SSOT; el test de paridad de abajo impide que se vuelvan a separar.
    it('forbids content-tier assist logs on the three pastor-voice steps', () => {
        expect(AI_ASSIST_FORBIDDEN_STEPS).toEqual(PASTOR_VOICE_STEPS);
        for (const step of PASTOR_VOICE_STEPS) {
            expect(isAiAssistAllowed(step)).toBe(false);
            expect(() => assertAiAssistAllowed(step)).toThrow();
        }
    });

    it('allows assist logs on the assistant-supported steps', () => {
        expect(isAiAssistAllowed('contextGenre')).toBe(true);
        expect(isAiAssistAllowed('structuralAnalysis')).toBe(true);
        expect(isAiAssistAllowed('wordStudies')).toBe(true);
        expect(() => assertAiAssistAllowed('wordStudies')).not.toThrow();
    });

    // Lo que hace seguro haber sumado `timelessPrinciple`: su verificador de
    // eisegesis es tier de VALIDACIÓN y sigue pasando. Prohibir generar no es
    // prohibir acompañar.
    it('validation-tier assists still pass on pastor-voice steps', () => {
        expect(isAiAssistAllowed('timelessPrinciple', 'eisegesisCheck')).toBe(true);
        expect(isAiAssistAllowed('reading', 'stepOrientation')).toBe(true);
        expect(isAiAssistAllowed('insight', 'socraticGuidance')).toBe(true);
        expect(() => assertAiAssistAllowed('timelessPrinciple', 'eisegesisCheck')).not.toThrow();
    });
});

describe('voz del pastor — paridad entre los encodings (SSOT)', () => {
    it('cada paso de voz del pastor tiene al menos un campo prohibido, y viceversa', () => {
        const prefijos = new Set(PASTORAL_SEED_AI_FORBIDDEN_FIELDS.map(f => f.split('.')[0]));
        for (const step of PASTOR_VOICE_STEPS) {
            expect(prefijos.has(step), `${step} es voz del pastor y no tiene campos protegidos`).toBe(true);
        }
        for (const prefijo of prefijos) {
            expect(
                PASTOR_VOICE_STEPS.includes(prefijo as (typeof PASTOR_VOICE_STEPS)[number]),
                `${prefijo} tiene campos protegidos pero no está en PASTOR_VOICE_STEPS`,
            ).toBe(true);
        }
    });

    it('la primera impresión del pastor está protegida (faltaba)', () => {
        // Sin esto, un mapper paper→wizard podía pre-llenarla sin que nada lo
        // detuviera.
        expect(PASTORAL_SEED_AI_FORBIDDEN_FIELDS).toContain('reading.firstImpression');
    });
});

describe('createEmptyPastoralSeed — superficie de creación (origin)', () => {
    it('registra la superficie cuando el creador la declara', () => {
        const seed = createEmptyPastoralSeed({
            id: 's1',
            sermonId: 'srm1',
            userId: 'u1',
            passage: 'Romanos 8:28',
            origin: 'wizard',
        });
        expect(seed.origin).toBe('wizard');
    });

    it('sin superficie declarada queda ausente — desconocido, no se inventa', () => {
        const seed = createEmptyPastoralSeed({
            id: 's1',
            sermonId: 'srm1',
            userId: 'u1',
            passage: 'Romanos 8:28',
        });
        expect(seed.origin).toBeUndefined();
        expect('origin' in seed).toBe(false);
    });
});
