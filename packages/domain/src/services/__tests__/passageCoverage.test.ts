import { describe, it, expect } from 'vitest';
import { assemblePassageProfile, RECONFRONT_CAPS } from '../../entities/PassageProfile';
import { GOLDEN_PASSAGE_PROFILES } from '../../entities/__tests__/passageProfileCorpus';
import {
    buildCoverageContract,
    buildCoverageStepTexts,
    computeCoverageSummary,
    type StepTexts,
} from '../passageCoverage';
import type { PastoralSeed } from '../../entities/PastoralSeed';

const now = new Date('2026-06-22T00:00:00Z');
const secondPeter = assemblePassageProfile(GOLDEN_PASSAGE_PROFILES[0].raw, ['epistle'], now);

describe('CA2 — tope de re-confront como dato', () => {
    it('common-misreading = 1, theological-tension = 0', () => {
        expect(RECONFRONT_CAPS['common-misreading']).toBe(1);
        expect(RECONFRONT_CAPS['theological-tension']).toBe(0);
    });
});

describe('buildCoverageContract', () => {
    it('deriva un ítem por movimiento + uno por feature (2 Pedro: 3 mov + 2 alusiones + 1 misreading)', () => {
        const contract = buildCoverageContract(secondPeter);
        expect(contract.items).toHaveLength(6);
        expect(contract.items.filter((i) => i.typeKey === 'movements')).toHaveLength(3);
        expect(contract.items.filter((i) => i.typeKey === 'ot-allusion')).toHaveLength(2);
        expect(contract.items.filter((i) => i.typeKey === 'common-misreading')).toHaveLength(1);
    });

    it('rutea cada tipo a su paso + regla (D4/D1)', () => {
        const contract = buildCoverageContract(secondPeter);
        const allusion = contract.items.find((i) => i.typeKey === 'ot-allusion')!;
        const misreading = contract.items.find((i) => i.typeKey === 'common-misreading')!;
        expect(allusion).toMatchObject({ routeToStep: 'recognition', coverageRule: 'must-touch' });
        expect(misreading).toMatchObject({ routeToStep: 'function', coverageRule: 'nudge-only' });
    });

    it('seed sin perfil → contrato vacío', () => {
        expect(buildCoverageContract(undefined).items).toEqual([]);
    });
});

describe('computeCoverageSummary', () => {
    const contract = buildCoverageContract(secondPeter);

    it('marca tocado cuando el ancla aparece en el texto del paso ruteado', () => {
        const stepTexts: StepTexts = {
            recognition: 'Números 22-24: Balaam amó el premio; Proverbios 26:11: el perro vuelve.',
            structuralAnalysis: '2 Pedro 2:10-16 acusación; 2 Pedro 2:17-19 vacío; 2 Pedro 2:20-22 fin peor.',
            function: 'La advertencia confronta la lectura de Juan 10:28-29 sobre falsos maestros.',
        };
        const report = computeCoverageSummary(contract, stepTexts);
        expect(report.items.every((i) => i.touched)).toBe(true);
        expect(report.gateStatus).toBe('pass');
        expect(report.mustTouchUntouched).toBe(0);
    });

    it('must-touch sin tratar → soft-block (nudge fuerte), NUNCA hard-block (D1)', () => {
        const report = computeCoverageSummary(contract, {}); // nada tocado
        expect(report.mustTouchUntouched).toBeGreaterThan(0);
        expect(report.gateStatus).toBe('soft-block');
        // D1: jamás bloqueo duro por omisión de cobertura.
        expect(report.gateStatus).not.toBe('hard-block');
    });

    it('E — buildCoverageStepTexts arma el texto por paso y el colector lo lee end-to-end', () => {
        const seed = {
            structuralAnalysis: { mainClause: { reference: '2 Pedro 2:10-16', pastorNote: 'acusación; 2 Pedro 2:17-19; 2 Pedro 2:20-22' } },
            recognition: { parallels: [
                { reference: 'Números 22-24', relevanceNote: 'Balaam', source: 'pastor-suggested' },
                { reference: 'Proverbios 26:11', relevanceNote: 'perro', source: 'pastor-suggested' },
            ] },
            function: { originalAudienceFunction: 'advertencia; confronta Juan 10:28-29' },
        } as unknown as PastoralSeed;
        const report = computeCoverageSummary(contract, buildCoverageStepTexts(seed));
        // Todos los must-touch (movimientos + 2 alusiones) tocados → pass.
        expect(report.gateStatus).toBe('pass');
        expect(report.mustTouchUntouched).toBe(0);
    });

    it('nudge-only sin tratar NO cambia el gate (solo informativo)', () => {
        // Todos los must-touch tocados, pero la misreading (nudge-only) no.
        const stepTexts: StepTexts = {
            recognition: 'Números 22-24 y Proverbios 26:11 tratados.',
            structuralAnalysis: '2 Pedro 2:10-16 / 2 Pedro 2:17-19 / 2 Pedro 2:20-22.',
        };
        const report = computeCoverageSummary(contract, stepTexts);
        expect(report.nudgeOnlyUnaddressed).toBe(1);
        expect(report.gateStatus).toBe('pass'); // nudge-only no bloquea
    });
});
