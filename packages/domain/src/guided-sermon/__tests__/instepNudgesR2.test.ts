import { describe, it, expect } from 'vitest';
import { RecognitionStepPolicy } from '../policies/RecognitionStepPolicy';
import { StructuralAnalysisStepPolicy } from '../policies/StructuralAnalysisStepPolicy';
import { assemblePassageProfile } from '../../entities/PassageProfile';
import type { TurnContext } from '../SocraticTurn';

const profile = assemblePassageProfile(
    {
        passage: '2 Pedro 2:10-22',
        movements: [
            { reference: '2 Pedro 2:10-16', summary: 'acusación' },
            { reference: '2 Pedro 2:17-19', summary: 'su vacío' },
            { reference: '2 Pedro 2:20-22', summary: 'fin peor' },
        ],
        features: [
            { typeKey: 'ot-allusion', hays: 'allusion', verseRef: 'v.15-16', summary: 'Balaam',
              anchor: { reference: 'Números 22-24' } },
            { typeKey: 'ot-allusion', hays: 'allusion', verseRef: 'v.22', summary: 'perro al vómito',
              anchor: { reference: 'Proverbios 26:11' } },
        ],
    },
    ['epistle'],
    new Date('2026-06-22T00:00:00Z'),
);

function ctx(step: 'recognition' | 'structuralAnalysis', enforceCoverage: boolean): TurnContext {
    return { passage: '2 Pedro 2:10-22', currentStep: step, pastorDraft: '', attemptIndex: 0, passageProfile: profile, enforceCoverage };
}

describe('R2 — nudge de alusiones AT (Recognition)', () => {
    const policy = new RecognitionStepPolicy();
    it('enforce ON → surface las alusiones (Balaam + Prov 26:11)', () => {
        const p = policy.buildSystemPrompt(ctx('recognition', true));
        expect(p).toContain('alusiones/citas del AT');
        expect(p).toContain('Números 22-24');
        expect(p).toContain('Proverbios 26:11');
    });
    it('enforce OFF → prompt clásico, sin alusiones', () => {
        const p = policy.buildSystemPrompt(ctx('recognition', false));
        expect(p).not.toContain('alusiones/citas del AT');
        expect(p).not.toContain('Números 22-24');
    });
});

describe('R2 — nudge de movimientos (Structural)', () => {
    const policy = new StructuralAnalysisStepPolicy();
    it('enforce ON + >1 movimiento → surface los 3 movimientos', () => {
        const p = policy.buildSystemPrompt(ctx('structuralAnalysis', true));
        expect(p).toContain('3 movimientos');
        expect(p).toContain('2 Pedro 2:17-19');
    });
    it('enforce OFF → sin nudge de movimientos', () => {
        const p = policy.buildSystemPrompt(ctx('structuralAnalysis', false));
        expect(p).not.toContain('movimientos (insumo estructural)');
    });
});
