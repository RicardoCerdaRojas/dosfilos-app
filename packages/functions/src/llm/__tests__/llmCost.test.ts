import { describe, expect, it } from 'vitest';
import { estimateUsd, hasKnownPricing, pricingFor, FALLBACK_PRICING } from '../llmCost';

describe('estimateUsd', () => {
    it('cobra entrada y salida por separado', () => {
        // 1M in @ 0.30 + 1M out @ 2.50
        expect(estimateUsd('gemini-2.5-flash', 1_000_000, 1_000_000)).toBeCloseTo(2.8, 6);
    });

    it('escala lineal con los tokens', () => {
        const uno = estimateUsd('claude-sonnet-4-6', 1000, 500);
        const diez = estimateUsd('claude-sonnet-4-6', 10_000, 5000);
        expect(diez).toBeCloseTo(uno * 10, 9);
    });

    it('una llamada sin tokens cuesta cero', () => {
        expect(estimateUsd('gemini-2.5-flash', 0, 0)).toBe(0);
    });

    it('tokens basura (NaN, negativos) no producen costos absurdos', () => {
        expect(estimateUsd('gemini-2.5-flash', NaN, -50)).toBe(0);
    });

    it('un modelo desconocido usa el respaldo CARO — sobreestimar es preferible a no ver la fuga', () => {
        expect(hasKnownPricing('modelo-que-no-existe')).toBe(false);
        expect(pricingFor('modelo-que-no-existe')).toEqual(FALLBACK_PRICING);
        expect(estimateUsd('modelo-que-no-existe', 1_000_000, 0)).toBeCloseTo(3, 6);
    });
});
