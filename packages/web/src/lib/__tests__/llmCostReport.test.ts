import { describe, expect, it } from 'vitest';
import { buildLlmCostReport, budgetLevel, type LlmUsageDay } from '../llmCostReport';

const NOW = new Date('2026-08-19T12:00:00Z');

function day(d: string, usd: number, extra: Partial<LlmUsageDay> = {}): LlmUsageDay {
    return {
        day: d,
        usd,
        calls: 1,
        inputTokens: 0,
        outputTokens: 0,
        usdFromFallbackPricing: 0,
        byFeature: {},
        byUser: {},
        byModel: {},
        ...extra,
    };
}

describe('budgetLevel', () => {
    it('avisa a la MITAD del presupuesto, no al final', () => {
        expect(budgetLevel(49)).toBe('ok');
        expect(budgetLevel(50)).toBe('warn');
        expect(budgetLevel(80)).toBe('high');
        expect(budgetLevel(100)).toBe('over');
        expect(budgetLevel(250)).toBe('over');
    });
});

describe('buildLlmCostReport', () => {
    it('el mes en curso ignora los días de meses anteriores', () => {
        const r = buildLlmCostReport([day('2026-07-31', 100), day('2026-08-01', 5)], 25, NOW);
        expect(r.monthUsd).toBe(5);
    });

    it('calcula hoy, 7 días y % del presupuesto', () => {
        const r = buildLlmCostReport(
            [day('2026-08-01', 4), day('2026-08-15', 4), day('2026-08-19', 4.5)],
            25,
            NOW,
        );
        expect(r.todayUsd).toBe(4.5);
        // Ventana 13→19 de agosto: entra el día 15 (4) y hoy (4.5); el 1 queda fuera.
        expect(r.last7Usd).toBe(8.5);
        expect(r.monthUsd).toBe(12.5);
        expect(r.budgetPct).toBe(50);
        expect(r.level).toBe('warn');
    });

    it('rankea por feature con su participación del gasto', () => {
        const r = buildLlmCostReport(
            [
                day('2026-08-10', 10, { byFeature: { judge: { usd: 8, calls: 4 }, shadow: { usd: 2, calls: 9 } } }),
                day('2026-08-11', 10, { byFeature: { judge: { usd: 10, calls: 5 } } }),
            ],
            25,
            NOW,
        );
        expect(r.byFeature[0]).toMatchObject({ key: 'judge', usd: 18, calls: 9 });
        expect(r.byFeature[0]!.pct).toBeCloseTo(90, 5);
        expect(r.byFeature[1]!.key).toBe('shadow');
    });

    it('separa cuánto del gasto viene de modelos sin precio propio', () => {
        const r = buildLlmCostReport([day('2026-08-10', 9, { usdFromFallbackPricing: 6 })], 25, NOW);
        expect(r.monthUsdFromFallback).toBe(6);
    });

    it('sin datos no divide por cero', () => {
        const r = buildLlmCostReport([], 25, NOW);
        expect(r.monthUsd).toBe(0);
        expect(r.budgetPct).toBe(0);
        expect(r.level).toBe('ok');
    });

    it('presupuesto cero no produce Infinity', () => {
        const r = buildLlmCostReport([day('2026-08-10', 5)], 0, NOW);
        expect(Number.isFinite(r.budgetPct)).toBe(true);
    });
});
