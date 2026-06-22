import { describe, it, expect } from 'vitest';
import { FunctionStepPolicy } from '../policies/FunctionStepPolicy';
import { assemblePassageProfile } from '../../entities/PassageProfile';
import type { TurnContext } from '../SocraticTurn';

const policy = new FunctionStepPolicy();

const profile = assemblePassageProfile(
    {
        passage: '2 Pedro 2:10-22',
        movements: [],
        features: [
            {
                typeKey: 'common-misreading',
                verseRef: 'v.20-22',
                claim: 'el pasaje enseña que se pierde la salvación',
                whyWrong: 'describe falsos maestros que apostatan',
                correctiveAnchor: [{ reference: 'v.22' }, { reference: 'Juan 10:28-29' }],
            },
        ],
    },
    ['epistle'],
    new Date('2026-06-22T00:00:00Z'),
);

function ctx(enforceCoverage: boolean): TurnContext {
    return {
        passage: '2 Pedro 2:10-22',
        currentStep: 'function',
        pastorDraft: '',
        attemptIndex: 0,
        passageProfile: profile,
        enforceCoverage,
    };
}

describe('FunctionStepPolicy — nudge de misreading (gated por enforce)', () => {
    it('enforce OFF → el prompt NO menciona la lectura errónea (clásico)', () => {
        const prompt = policy.buildSystemPrompt(ctx(false));
        expect(prompt).not.toContain('lecturas erróneas frecuentes');
        expect(prompt).not.toContain('se pierde la salvación');
    });

    it('enforce ON + feature → el prompt surface la mala lectura + el ancla', () => {
        const prompt = policy.buildSystemPrompt(ctx(true));
        expect(prompt).toContain('lecturas erróneas frecuentes');
        expect(prompt).toContain('se pierde la salvación');
        expect(prompt).toContain('Juan 10:28-29');
        expect(prompt).toContain('common-misreading');
    });

    it('enforce ON pero sin perfil → sin nudge', () => {
        const prompt = policy.buildSystemPrompt({ ...ctx(true), passageProfile: undefined });
        expect(prompt).not.toContain('lecturas erróneas frecuentes');
    });
});
