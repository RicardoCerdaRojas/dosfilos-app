import { describe, it, expect } from 'vitest';
import { FunctionStepPolicy } from '../policies/FunctionStepPolicy';
import { assemblePassageProfile, FEATURE_CATALOG_V1 } from '../../entities/PassageProfile';
import type { TurnContext } from '../SocraticTurn';

const policy = new FunctionStepPolicy();

const profile = assemblePassageProfile(
    {
        passage: '2 Pedro 2:10-22',
        movements: [],
        features: [
            { typeKey: 'illustration', verseRef: 'v.22', summary: 'el perro vuelve a su vómito' },
        ],
    },
    ['epistle'],
    new Date('2026-06-22T00:00:00Z'),
);

function ctx(enforceCoverage: boolean): TurnContext {
    return { passage: '2 Pedro 2:10-22', currentStep: 'function', pastorDraft: '', attemptIndex: 0, passageProfile: profile, enforceCoverage };
}

describe('R4 — catálogo + nudge de ilustración', () => {
    it('illustration en el catálogo: hard, must-touch, ruteada a function', () => {
        expect(FEATURE_CATALOG_V1.illustration).toMatchObject({
            kind: 'hard', routeToStep: 'function', coverageRule: 'must-touch',
        });
    });

    it('assemble descarta una ilustración sin verso/imagen (anti-alucinación)', () => {
        const p = assemblePassageProfile(
            { passage: 'x', movements: [], features: [{ typeKey: 'illustration', verseRef: '', summary: '' }] },
            [], new Date(),
        );
        expect(p.features).toHaveLength(0);
    });

    it('enforce ON → el prompt surface la ilustración', () => {
        const prompt = policy.buildSystemPrompt(ctx(true));
        expect(prompt).toContain('ilustraciones/metáforas directas');
        expect(prompt).toContain('el perro vuelve a su vómito');
    });

    it('enforce OFF → sin nudge de ilustración (clásico)', () => {
        const prompt = policy.buildSystemPrompt(ctx(false));
        expect(prompt).not.toContain('ilustraciones/metáforas directas');
    });
});
