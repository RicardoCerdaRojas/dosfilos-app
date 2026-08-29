import type { MovementBudget } from './movementBudget';

/**
 * Informe del ensayo (F3).
 *
 * "El predicador descubre el miércoles que la introducción le come 12 de sus
 * 35 minutos." Ese es todo el producto: un cronómetro con memoria que
 * compara lo que TARDÓ contra lo que el presupuesto decía. No hay nada que
 * generar ni que sugerir — es aritmética, y el juicio lo pone el pastor.
 */
export interface RehearsalRow {
    slug: string;
    title: string;
    /** Segundos que realmente duró el movimiento. */
    actualSeconds: number;
    /** Lo que el presupuesto le asignaba. */
    budgetSeconds: number;
    /** Positivo: se pasó. Negativo: le sobró. */
    driftSeconds: number;
    /** Se pasó más de un quinto de lo previsto. */
    overweight: boolean;
}

export interface RehearsalReport {
    rows: RehearsalRow[];
    totalActual: number;
    totalBudget: number;
}

/**
 * Umbral para marcar un movimiento como pasado de peso. Un 20 % de desvío en
 * un movimiento de cinco minutos es un minuto: se nota desde el banco.
 */
const OVERWEIGHT_RATIO = 0.2;

export function buildRehearsalReport(
    budgets: MovementBudget[],
    actualBySlug: Record<string, number>,
): RehearsalReport {
    const rows: RehearsalRow[] = budgets.map((budget) => {
        const actualSeconds = Math.round(actualBySlug[budget.slug] ?? 0);
        const driftSeconds = actualSeconds - budget.seconds;
        return {
            slug: budget.slug,
            title: budget.title,
            actualSeconds,
            budgetSeconds: budget.seconds,
            driftSeconds,
            overweight: driftSeconds > budget.seconds * OVERWEIGHT_RATIO,
        };
    });

    return {
        rows,
        totalActual: rows.reduce((sum, r) => sum + r.actualSeconds, 0),
        totalBudget: rows.reduce((sum, r) => sum + r.budgetSeconds, 0),
    };
}
