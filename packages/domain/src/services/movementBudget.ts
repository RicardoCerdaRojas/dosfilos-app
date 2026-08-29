/**
 * Presupuesto de tiempo por movimiento homilético.
 *
 * El riel del púlpito responde una sola pregunta —"¿voy a tiempo?"— y para
 * eso necesita saber cuánto DEBERÍA durar cada movimiento, no cuánto texto
 * tiene. Son cosas distintas: una ilustración se cuenta más lento que una
 * lista de implicaciones.
 *
 * Hasta que el modo ensayo (F3) mida tiempos reales, el reparto por defecto
 * es proporcional a las palabras. Es una aproximación honesta y el pastor
 * puede corregir cualquier movimiento a mano; los que no toca se reparten el
 * tiempo que queda, así que ajustar uno no descuadra el total.
 */

/** Un movimiento con su presupuesto ya resuelto, en segundos. */
export interface MovementBudget {
    slug: string;
    title: string;
    /** Segundos asignados. Siempre > 0. */
    seconds: number;
    /** `true` si el pastor lo fijó a mano. */
    pinned: boolean;
}

/** Entrada mínima: lo que el lector ya sabe de cada movimiento. */
export interface MovementInput {
    slug: string;
    title: string;
    /** Cuerpo markdown; se cuentan sus palabras. */
    body: string;
}

/** Ajustes manuales del pastor, en segundos, por slug de movimiento. */
export type BudgetOverrides = Record<string, number>;

/** Piso por movimiento: nada baja de aquí aunque el texto sea mínimo. */
const MIN_SECONDS = 30;

export function countWords(text: string): number {
    const trimmed = (text ?? '').trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
}

/**
 * Palabras por minuto de PREDICACIÓN, no de lectura.
 *
 * Leer en silencio son 230-250 y leer en voz alta 150-160. Predicar es más
 * lento todavía: hay pausas deliberadas, se repite una frase para que entre,
 * se mira a la gente. La bibliografía homilética trabaja entre 120 y 140; 130
 * es el centro y no promete precisión que no se puede tener.
 */
export const PREACHING_WORDS_PER_MINUTE = 130;

/**
 * Cuánto dura un texto dicho en voz alta, en minutos.
 *
 * Es una ESTIMACIÓN y se redondea a minutos enteros: dar "27,4" fingiría una
 * exactitud que ningún predicador tiene. Sirve para lo que el pastor pregunta
 * antes de subir —"¿me paso de la hora?"— no para cronometrar.
 */
export function estimateSpokenMinutes(text: string): number {
    const words = countWords(text);
    if (!words) return 0;
    return Math.max(1, Math.round(words / PREACHING_WORDS_PER_MINUTE));
}

/**
 * Reparte `targetSeconds` entre los movimientos.
 *
 * Los fijados a mano se respetan tal cual; el resto se reparte lo que queda,
 * proporcional a sus palabras. Si lo fijado ya consume todo el objetivo, los
 * demás caen al piso — el riel mostrará el exceso, que es información
 * verdadera y no conviene esconder redondeando.
 */
export function buildMovementBudgets(
    movements: MovementInput[],
    targetSeconds: number,
    overrides: BudgetOverrides = {},
): MovementBudget[] {
    if (!movements.length) return [];

    const pinnedTotal = movements.reduce(
        (sum, m) => sum + (isPinned(overrides, m.slug) ? Math.max(MIN_SECONDS, overrides[m.slug]) : 0),
        0,
    );
    const free = movements.filter((m) => !isPinned(overrides, m.slug));
    const freeWords = free.reduce((sum, m) => sum + countWords(m.body), 0);
    const remaining = Math.max(0, targetSeconds - pinnedTotal);

    return movements.map((m) => {
        if (isPinned(overrides, m.slug)) {
            return {
                slug: m.slug,
                title: m.title,
                seconds: Math.max(MIN_SECONDS, Math.round(overrides[m.slug])),
                pinned: true,
            };
        }
        // Sin palabras en ningún movimiento libre, se reparte en partes iguales.
        const share =
            freeWords > 0 ? countWords(m.body) / freeWords : 1 / Math.max(1, free.length);
        return {
            slug: m.slug,
            title: m.title,
            seconds: Math.max(MIN_SECONDS, Math.round(remaining * share)),
            pinned: false,
        };
    });
}

function isPinned(overrides: BudgetOverrides, slug: string): boolean {
    return typeof overrides[slug] === 'number' && Number.isFinite(overrides[slug]);
}

/** Dónde estás respecto del presupuesto, para el riel y el veredicto. */
export interface BudgetPosition {
    /** Índice del movimiento que se está predicando. */
    index: number;
    /** Segundos que el presupuesto asigna hasta el FINAL de ese movimiento. */
    endsAt: number;
    /** Positivo: te quedan. Negativo: te pasaste. */
    remainingInMovement: number;
    late: boolean;
}

/**
 * Ubica el reloj dentro del reparto. `index` es el movimiento en el que el
 * PRESUPUESTO dice que deberías estar — no dónde estás leyendo. La
 * diferencia entre ambos es justamente lo que el predicador necesita ver.
 */
export function locateInBudget(budgets: MovementBudget[], elapsedSeconds: number): BudgetPosition {
    if (!budgets.length) {
        return { index: 0, endsAt: 0, remainingInMovement: 0, late: false };
    }
    let accumulated = 0;
    for (let i = 0; i < budgets.length; i += 1) {
        accumulated += budgets[i].seconds;
        if (elapsedSeconds < accumulated || i === budgets.length - 1) {
            const remaining = accumulated - elapsedSeconds;
            return {
                index: i,
                endsAt: accumulated,
                remainingInMovement: remaining,
                late: remaining < 0,
            };
        }
    }
    const total = budgets.reduce((s, b) => s + b.seconds, 0);
    return {
        index: budgets.length - 1,
        endsAt: total,
        remainingInMovement: total - elapsedSeconds,
        late: elapsedSeconds > total,
    };
}

/** Total presupuestado, para dibujar el riel a escala. */
export function totalBudget(budgets: MovementBudget[]): number {
    return budgets.reduce((sum, b) => sum + b.seconds, 0);
}
