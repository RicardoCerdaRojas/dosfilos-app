import { describe, it, expect } from 'vitest';

import {
    buildMovementBudgets,
    countWords,
    estimateSpokenMinutes,
    locateInBudget,
    totalBudget,
} from '../movementBudget';

const mv = (slug: string, words: number) => ({
    slug,
    title: slug,
    body: Array.from({ length: words }, (_, i) => `p${i}`).join(' '),
});

describe('buildMovementBudgets', () => {
    it('reparte proporcional a las palabras y respeta el objetivo', () => {
        const budgets = buildMovementBudgets([mv('a', 100), mv('b', 300)], 1800);
        expect(budgets.map((b) => b.seconds)).toEqual([450, 1350]);
        expect(totalBudget(budgets)).toBe(1800);
    });

    it('respeta lo fijado a mano y reparte el resto entre los libres', () => {
        const budgets = buildMovementBudgets(
            [mv('a', 100), mv('b', 100), mv('c', 200)],
            1800,
            { a: 600 },
        );
        expect(budgets[0]).toMatchObject({ seconds: 600, pinned: true });
        // Quedan 1200 para b (100 palabras) y c (200): un tercio y dos tercios.
        expect(budgets[1].seconds).toBe(400);
        expect(budgets[2].seconds).toBe(800);
    });

    it('ajustar un movimiento no descuadra el total', () => {
        const base = [mv('a', 100), mv('b', 100), mv('c', 200)];
        expect(totalBudget(buildMovementBudgets(base, 1800, { a: 600 }))).toBe(1800);
    });

    it('no baja del piso aunque el movimiento casi no tenga texto', () => {
        const budgets = buildMovementBudgets([mv('a', 1), mv('b', 5000)], 1800);
        expect(budgets[0].seconds).toBeGreaterThanOrEqual(30);
    });

    it('reparte en partes iguales si ningún movimiento libre tiene palabras', () => {
        const budgets = buildMovementBudgets(
            [{ slug: 'a', title: 'a', body: '' }, { slug: 'b', title: 'b', body: '' }],
            600,
        );
        expect(budgets.map((b) => b.seconds)).toEqual([300, 300]);
    });

    it('devuelve vacío sin movimientos', () => {
        expect(buildMovementBudgets([], 1800)).toEqual([]);
    });
});

describe('countWords', () => {
    it('ignora espacios de más y texto vacío', () => {
        expect(countWords('  hola   mundo  ')).toBe(2);
        expect(countWords('')).toBe(0);
        expect(countWords('   ')).toBe(0);
    });
});

describe('locateInBudget', () => {
    const budgets = buildMovementBudgets([mv('a', 100), mv('b', 100), mv('c', 100)], 900);

    it('ubica el movimiento según el reloj', () => {
        expect(locateInBudget(budgets, 0).index).toBe(0);
        expect(locateInBudget(budgets, 350).index).toBe(1);
        expect(locateInBudget(budgets, 700).index).toBe(2);
    });

    it('reporta lo que queda del movimiento en curso', () => {
        expect(locateInBudget(budgets, 100).remainingInMovement).toBe(200);
        expect(locateInBudget(budgets, 100).late).toBe(false);
    });

    it('marca atraso con el sobrante en negativo al pasarse del total', () => {
        const at = locateInBudget(budgets, 1000);
        expect(at.index).toBe(2);
        expect(at.late).toBe(true);
        expect(at.remainingInMovement).toBe(-100);
    });

    it('no explota sin presupuestos', () => {
        expect(locateInBudget([], 500)).toMatchObject({ index: 0, late: false });
    });
});

describe('estimateSpokenMinutes', () => {
    it('estima la duración hablada a ritmo de predicación', () => {
        // 260 palabras a 130 ppm son exactamente dos minutos.
        const text = Array.from({ length: 260 }, () => 'palabra').join(' ');
        expect(estimateSpokenMinutes(text)).toBe(2);
    });

    it('un texto vacío dura cero, no un minuto', () => {
        expect(estimateSpokenMinutes('   ')).toBe(0);
    });

    it('nunca devuelve cero para un texto que existe: el piso es un minuto', () => {
        expect(estimateSpokenMinutes('tres palabras sueltas')).toBe(1);
    });
});
