import { describe, it, expect } from 'vitest';
import {
    assemblePassageProfile,
    FEATURE_CATALOG_V1,
    featuresForStep,
} from '../../entities/PassageProfile';
import { buildCoverageContract } from '../passageCoverage';
import { StructuralAnalysisStepPolicy } from '../../guided-sermon/policies/StructuralAnalysisStepPolicy';
import { ContextGenreStepPolicy } from '../../guided-sermon/policies/ContextGenreStepPolicy';
import { WordStudiesStepPolicy } from '../../guided-sermon/policies/WordStudiesStepPolicy';
import type { TurnContext } from '../../guided-sermon/SocraticTurn';

const profile = assemblePassageProfile(
    {
        passage: 'Salmo 23',
        movements: [],
        features: [
            { typeKey: 'parallelism', verseRef: 'v.2', summary: 'delicados pastos // aguas de reposo' },
            { typeKey: 'named-entity', verseRef: 'v.15', name: 'Balaam hijo de Beor', note: 'profeta del AT' },
            { typeKey: 'textual-crux', verseRef: 'v.13', summary: "algunos mss. leen 'ágapais' vs 'apátais'" },
            // sin ancla → debe descartarse
            { typeKey: 'parallelism', verseRef: '', summary: '' },
        ],
    },
    ['poetry'],
    new Date('2026-06-22T00:00:00Z'),
);

describe('R7 — catálogo de los 3 tipos nuevos', () => {
    it('rutea cada tipo a su paso + kind/regla', () => {
        expect(FEATURE_CATALOG_V1.parallelism).toMatchObject({ kind: 'hard', routeToStep: 'structuralAnalysis', coverageRule: 'must-touch' });
        expect(FEATURE_CATALOG_V1['named-entity']).toMatchObject({ kind: 'hard', routeToStep: 'contextGenre', coverageRule: 'nudge-only' });
        expect(FEATURE_CATALOG_V1['textual-crux']).toMatchObject({ kind: 'soft', routeToStep: 'wordStudies', coverageRule: 'nudge-only' });
    });

    it('assemble descarta la feature sin ancla (queda 3 de 4)', () => {
        expect(profile.features).toHaveLength(3);
    });

    it('featuresForStep rutea correcto (catalog-driven)', () => {
        expect(featuresForStep(profile, 'structuralAnalysis').map((f) => f.typeKey)).toContain('parallelism');
        expect(featuresForStep(profile, 'contextGenre').map((f) => f.typeKey)).toContain('named-entity');
        expect(featuresForStep(profile, 'wordStudies').map((f) => f.typeKey)).toContain('textual-crux');
    });
});

describe('R7 — buildCoverageContract incluye los 3 tipos con su route/rule', () => {
    const contract = buildCoverageContract(profile);
    it('parallelism → must-touch en structuralAnalysis', () => {
        const it1 = contract.items.find((i) => i.typeKey === 'parallelism')!;
        expect(it1).toMatchObject({ routeToStep: 'structuralAnalysis', coverageRule: 'must-touch' });
    });
    it('named-entity → nudge-only en contextGenre; textual-crux → nudge-only en wordStudies', () => {
        expect(contract.items.find((i) => i.typeKey === 'named-entity')).toMatchObject({ routeToStep: 'contextGenre', coverageRule: 'nudge-only' });
        expect(contract.items.find((i) => i.typeKey === 'textual-crux')).toMatchObject({ routeToStep: 'wordStudies', coverageRule: 'nudge-only' });
    });
});

describe('R7 — nudges in-step (gated enforce)', () => {
    function ctx(step: TurnContext['currentStep'], enforceCoverage: boolean): TurnContext {
        return { passage: 'Salmo 23', currentStep: step, pastorDraft: '', attemptIndex: 0, passageProfile: profile, enforceCoverage };
    }
    it('parallelism en Structural; named-entity en ContextGenre; textual-crux en WordStudies (enforce ON)', () => {
        expect(new StructuralAnalysisStepPolicy().buildSystemPrompt(ctx('structuralAnalysis', true))).toContain('paralelismos poéticos');
        expect(new ContextGenreStepPolicy().buildSystemPrompt(ctx('contextGenre', true))).toContain('Balaam hijo de Beor');
        expect(new WordStudiesStepPolicy().buildSystemPrompt(ctx('wordStudies', true))).toContain('cruces/variantes textuales');
    });
    it('enforce OFF → ninguno aparece', () => {
        expect(new StructuralAnalysisStepPolicy().buildSystemPrompt(ctx('structuralAnalysis', false))).not.toContain('paralelismos poéticos');
        expect(new ContextGenreStepPolicy().buildSystemPrompt(ctx('contextGenre', false))).not.toContain('Balaam hijo de Beor');
        expect(new WordStudiesStepPolicy().buildSystemPrompt(ctx('wordStudies', false))).not.toContain('cruces/variantes textuales');
    });
});
