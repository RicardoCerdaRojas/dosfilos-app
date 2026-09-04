import { describe, it, expect } from 'vitest';
import {
    EXTRACTION_TIMEOUT_SECONDS,
    FALLBACK_RESERVE_SECONDS,
    MIN_ACCOUNT_POLL_SECONDS,
    pollBudgetForAccount,
} from '../extractionBudget';

describe('pollBudgetForAccount', () => {
    it('nunca reparte más de lo que la invocación puede vivir', () => {
        const budget = pollBudgetForAccount({ elapsedSeconds: 0, accountsRemaining: 2 });
        expect(budget * 2 + FALLBACK_RESERVE_SECONDS).toBeLessThanOrEqual(EXTRACTION_TIMEOUT_SECONDS);
    });

    it('descuenta lo que la invocación ya gastó', () => {
        const alEmpezar = pollBudgetForAccount({ elapsedSeconds: 0, accountsRemaining: 2 });
        const conTreintaGastados = pollBudgetForAccount({ elapsedSeconds: 30, accountsRemaining: 2 });
        expect(conTreintaGastados).toBeLessThan(alEmpezar);
        expect(conTreintaGastados).toBe(Math.floor((EXTRACTION_TIMEOUT_SECONDS - 30 - FALLBACK_RESERVE_SECONDS) / 2));
    });

    it('la última cuenta se queda con todo lo que sobra', () => {
        const dos = pollBudgetForAccount({ elapsedSeconds: 0, accountsRemaining: 2 });
        const una = pollBudgetForAccount({ elapsedSeconds: 0, accountsRemaining: 1 });
        expect(una).toBeGreaterThan(dos);
    });

    it('devuelve 0 cuando no queda aire, para no empezar lo que no termina', () => {
        expect(pollBudgetForAccount({ elapsedSeconds: 500, accountsRemaining: 1 })).toBe(0);
        expect(pollBudgetForAccount({ elapsedSeconds: EXTRACTION_TIMEOUT_SECONDS + 60, accountsRemaining: 1 })).toBe(0);
    });

    it('devuelve 0 cuando el reparto queda bajo el mínimo útil', () => {
        const casiSinAire = EXTRACTION_TIMEOUT_SECONDS - FALLBACK_RESERVE_SECONDS - MIN_ACCOUNT_POLL_SECONDS + 1;
        expect(pollBudgetForAccount({ elapsedSeconds: casiSinAire, accountsRemaining: 1 })).toBe(0);
    });

    it('el escenario que rompió en producción ya no cabe: 600 s por cuenta', () => {
        // Adamson: dos cuentas esperando ~495 s cada una dentro de 540 s.
        const primera = pollBudgetForAccount({ elapsedSeconds: 12, accountsRemaining: 2 });
        expect(primera).toBeLessThan(495);
        const segunda = pollBudgetForAccount({ elapsedSeconds: 12 + primera, accountsRemaining: 1 });
        expect(12 + primera + segunda).toBeLessThanOrEqual(EXTRACTION_TIMEOUT_SECONDS - FALLBACK_RESERVE_SECONDS);
    });
});
