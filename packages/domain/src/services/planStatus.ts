/**
 * En qué punto está un plan de predicación, DEDUCIDO de lo que ya pasó.
 *
 * POR QUÉ NO ES UN CAMPO. Un estado guardado hay que mantenerlo: alguien tiene
 * que marcar el plan como activo, y otro alguien acordarse de cerrarlo cuando
 * termina. En la práctica nadie lo hace, y entonces la app muestra como activo
 * un plan que terminó en marzo. Un plan está activo porque se está predicando
 * —eso ya está registrado en cada sermón— así que el estado se calcula y no
 * puede quedar viejo.
 *
 * Consecuencia deseada: marcar un sermón como predicado cierra el plan solo
 * cuando era el último, y ninguna pantalla necesita enterarse.
 */

export type PlanStatus =
    /** Se está predicando: hay algo predicado, o ya empezó por calendario. */
    | 'active'
    /** Armado y todavía sin empezar. */
    | 'upcoming'
    /** Todos sus sermones se predicaron. */
    | 'finished'
    /** Sin sermones: existe el plan y no hay qué predicar. */
    | 'empty';

export interface PlanItemState {
    /** Orden dentro del plan. */
    week: number;
    scheduledDate?: Date | undefined;
    /** Hay un sermón terminado detrás de esta semana. */
    ready: boolean;
    preached: boolean;
}

export function planStatus(items: PlanItemState[], now: Date = new Date()): PlanStatus {
    if (!items.length) return 'empty';
    if (items.every((item) => item.preached)) return 'finished';
    const started =
        items.some((item) => item.preached) ||
        items.some((item) => item.scheduledDate && item.scheduledDate.getTime() <= now.getTime());
    return started ? 'active' : 'upcoming';
}

/**
 * El orden en que se van a predicar: por fecha cuando la hay, por semana
 * cuando no.
 *
 * Las dos claves conviven porque el planificador no siempre agenda: un plan
 * puede tener las ocho semanas numeradas y ninguna fecha, y ahí el número ES
 * el orden.
 */
export function planOrder(a: PlanItemState, b: PlanItemState): number {
    const aDate = a.scheduledDate?.getTime();
    const bDate = b.scheduledDate?.getTime();
    if (aDate !== undefined && bDate !== undefined) return aDate - bDate;
    if (aDate !== undefined) return -1;
    if (bDate !== undefined) return 1;
    return a.week - b.week;
}

/**
 * Lo próximo del plan: el primero sin predicar, en orden de predicación.
 *
 * NO es "el último creado" ni "el más reciente". Un pastor que escribe cuatro
 * sermones de una serie en una tarde publica el cuarto al final, y el que le
 * toca predicar el domingo es el primero.
 */
export function nextInPlan<T extends PlanItemState>(items: T[]): T | null {
    const pending = items.filter((item) => !item.preached).sort(planOrder);
    return pending[0] ?? null;
}

/**
 * El plan que la app debe mostrar: el activo; si no hay, el que está por
 * empezar. Los terminados no compiten — su lugar es el archivo.
 */
export function pickCurrentPlan<T>(
    plans: T[],
    statusOf: (plan: T) => PlanStatus,
): T | null {
    return (
        plans.find((plan) => statusOf(plan) === 'active') ??
        plans.find((plan) => statusOf(plan) === 'upcoming') ??
        null
    );
}
