import { describe, expect, it } from 'vitest';
import { DEFAULT_BUDGET, shadowExhausted } from '../llmBudget';

/**
 * Lo que se prueba acá es la POLÍTICA del cortacircuito, no la lectura de
 * Firestore: cuándo corta, cuándo no, y qué hace ante una config rota.
 */

describe('shadowExhausted', () => {
    it('corta al alcanzar el tope, no solo al superarlo', () => {
        expect(shadowExhausted(1.5, 1.5)).toBe(true);
        expect(shadowExhausted(1.49, 1.5)).toBe(false);
    });

    it('un tope de 0 o negativo DESACTIVA el corte, no corta siempre', () => {
        // Apagar la medición por una config vacía sería el peor default posible.
        expect(shadowExhausted(999, 0)).toBe(false);
        expect(shadowExhausted(999, -1)).toBe(false);
    });

    it('valores no numéricos no cortan (no apagamos la sombra por un dato roto)', () => {
        expect(shadowExhausted(NaN, 1.5)).toBe(false);
        expect(shadowExhausted(1, NaN)).toBe(false);
    });
});

describe('DEFAULT_BUDGET', () => {
    it('avisa a la mitad, no al final', () => {
        expect(DEFAULT_BUDGET.alertPcts).toEqual([50, 80, 100]);
    });

    it('el tope diario de sombra es una fracción del mensual — un día no se come el mes', () => {
        expect(DEFAULT_BUDGET.shadowDailyUsdCap).toBeLessThan(DEFAULT_BUDGET.monthlyUsd / 10);
    });
});
