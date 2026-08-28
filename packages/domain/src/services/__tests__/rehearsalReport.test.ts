import { describe, it, expect } from 'vitest';

import { buildRehearsalReport } from '../rehearsalReport';
import type { MovementBudget } from '../movementBudget';

const budget = (slug: string, seconds: number): MovementBudget => ({
    slug,
    title: slug,
    seconds,
    pinned: false,
});

describe('buildRehearsalReport', () => {
    const budgets = [budget('intro', 300), budget('punto1', 600), budget('cierre', 300)];

    it('compara lo que tardó contra lo presupuestado', () => {
        const report = buildRehearsalReport(budgets, { intro: 720, punto1: 480, cierre: 300 });
        expect(report.rows.map((r) => r.driftSeconds)).toEqual([420, -120, 0]);
        expect(report.totalActual).toBe(1500);
        expect(report.totalBudget).toBe(1200);
    });

    it('marca pasado de peso al superar el 20 % del presupuesto', () => {
        const report = buildRehearsalReport(budgets, { intro: 361, punto1: 700, cierre: 300 });
        expect(report.rows[0].overweight).toBe(true);
        // 700 sobre 600 es un 16,7 %: dentro del margen.
        expect(report.rows[1].overweight).toBe(false);
        expect(report.rows[2].overweight).toBe(false);
    });

    it('un movimiento que no se ensayó cuenta cero, no rompe', () => {
        const report = buildRehearsalReport(budgets, { intro: 300 });
        expect(report.rows[1].actualSeconds).toBe(0);
        expect(report.rows[1].driftSeconds).toBe(-600);
    });

    it('sin presupuestos devuelve un informe vacío', () => {
        expect(buildRehearsalReport([], {})).toEqual({ rows: [], totalActual: 0, totalBudget: 0 });
    });
});
