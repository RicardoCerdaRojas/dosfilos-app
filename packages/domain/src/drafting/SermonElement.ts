/**
 * Un ELEMENTO del sermón: la unidad de decisión de la redacción socrática.
 *
 * ADR-037. Un elemento es una IDEA DECIDIBLE — una afirmación o imagen que
 * PODRÍA SER OTRA y que cambia el sermón si cambia. La prueba operativa:
 * ¿podría un pastor competente elegir distinto y seguir siendo fiel al texto?
 * Si sí, es elemento; si no, preguntarlo es fricción sin contenido.
 *
 * NO es un párrafo ni un campo del esquema: la prosa se redacta DESPUÉS, a
 * partir de los elementos decididos.
 */

/**
 * De dónde salió la idea. Es lo que se mide — no las palabras.
 *
 * `elegido` NO se funde con `pastor`: elegir entre propuestas es juicio, pero
 * no es origen, y fundirlos inflaría el número de autoría.
 */
export type ElementProvenance = 'pastor' | 'elegido' | 'editado' | 'descartado';

export interface SermonElement {
    id: string;
    /** Sección a la que pertenece: `introduction.historicalContext`, `point.1.exposition`… */
    sectionId: string;
    /** La idea, en una o dos frases. No es la prosa final. */
    text: string;
    provenance: ElementProvenance;
    /**
     * El texto tal como lo propuso la IA, cuando el pastor lo editó.
     *
     * Se conserva para que `editado` sea AUDITABLE: sin el original no hay
     * forma de distinguir una reformulación real de un cambio de una coma, y la
     * procedencia dejaría de significar algo.
     */
    proposedText?: string;
    decidedAt: Date;
}

/** Cuántos elementos tiene sentido pedir por sección (ADR-037). */
export const ELEMENTS_PER_SECTION = { min: 2, max: 7 } as const;

/**
 * Las procedencias que cuentan como autoría del pastor.
 *
 * `descartado` no cuenta porque el elemento no está en el sermón — pero se
 * registra igual: descartar una propuesta es un acto de juicio, y saber qué
 * rechazó dice tanto como saber qué aceptó.
 */
const DEL_PASTOR: readonly ElementProvenance[] = ['pastor', 'editado'];

export interface ProvenanceTally {
    pastor: number;
    elegido: number;
    editado: number;
    descartado: number;
    /** Elementos que quedan EN el sermón (todo menos los descartados). */
    inSermon: number;
    /**
     * 0-1 — proporción de lo que está en el sermón que ORIGINÓ el pastor.
     *
     * `elegido` queda fuera del numerador a propósito: la IA tuvo la idea, él
     * la aprobó. Cuenta en el denominador porque sí está en el sermón.
     */
    originatedRatio: number;
}

export function tallyProvenance(elements: readonly SermonElement[]): ProvenanceTally {
    const t = { pastor: 0, elegido: 0, editado: 0, descartado: 0 };
    for (const e of elements) t[e.provenance]++;
    const inSermon = t.pastor + t.elegido + t.editado;
    const suyos = DEL_PASTOR.reduce((n, p) => n + t[p], 0);
    return {
        ...t,
        inSermon,
        originatedRatio: inSermon === 0 ? 0 : suyos / inSermon,
    };
}
