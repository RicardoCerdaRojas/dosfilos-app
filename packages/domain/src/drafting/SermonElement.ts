import type { ContributionKind } from './classifyContribution';

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
    /**
     * Idea decidible (`elemento`) o tema a cubrir (`directiva`). ADR-037 Q5.
     *
     * Una DIRECTIVA no cuenta como idea originada: el pastor decidió que el
     * tema pertenece a la sección, pero el contenido que lo llena no admitía
     * alternativa. Contarla como idea suya inflaría la autoría con decisiones
     * que no se tomaron.
     */
    kind: ContributionKind;
    /**
     * Lo que el clasificador propuso, cuando el pastor lo corrigió.
     *
     * Se guarda por lo mismo que `proposedText`: sin el valor original, la
     * corrección no es auditable — y saber CUÁNTO se equivoca el clasificador
     * es el único dato que dice si el catálogo de verbos necesita crecer.
     */
    kindAuto?: ContributionKind;
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
    /**
     * La fuente de la biblioteca de la que salió este elemento, cuando salió
     * de una: hoy, las citas de autoridad propuestas desde sus libros.
     *
     * SIN el fragmento completo: eso pesa y sirve para DECIDIR (vive en la
     * propuesta); acá sólo hace falta lo que la bibliografía va a imprimir.
     * Sin este campo, la atribución quedaba escrita dentro del texto de la
     * cita pero el LIBRO no quedaba registrado en las fuentes del sermón: la
     * bibliografía no podía nombrar de dónde salió lo citado.
     */
    source?: ElementSource;
    decidedAt: Date;
}

/** Lo que la bibliografía necesita de una fuente. */
export interface ElementSource {
    title: string;
    author?: string;
    page?: string;
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

/**
 * Cuenta procedencia SOBRE LAS IDEAS, no sobre las directivas.
 *
 * Una directiva es una decisión de cobertura, no una idea: "Fecha del libro"
 * no admite alternativa una vez que se decide cubrirlo. Mezclarlas haría que
 * llenar la sección de temas subiera la autoría sin que el pastor haya
 * originado nada.
 */
export function tallyProvenance(elements: readonly SermonElement[]): ProvenanceTally {
    const t = { pastor: 0, elegido: 0, editado: 0, descartado: 0 };
    for (const e of elements) {
        if (e.kind !== 'elemento') continue;
        t[e.provenance]++;
    }
    const inSermon = t.pastor + t.elegido + t.editado;
    const suyos = DEL_PASTOR.reduce((n, p) => n + t[p], 0);
    return {
        ...t,
        inSermon,
        originatedRatio: inSermon === 0 ? 0 : suyos / inSermon,
    };
}


/**
 * Lectura CUALITATIVA de la procedencia de una sección.
 *
 * NO SE MUESTRA UN PORCENTAJE, y no es cosmética la decisión.
 *
 * El número es un NIVEL, y el nivel de una sección aislada no significa nada:
 * un pastor que empieza SELECCIONA mucho, porque está aprendiendo qué se puede
 * decir de esa sección — y seleccionar es el mecanismo por el que se forma.
 * "0 de 4 ideas son tuyas" en el primer uso se lee como un reproche por hacer
 * exactamente lo que corresponde hacer al principio.
 *
 * Lo que sí significa algo es la TRAYECTORIA a través de muchos sermones: si
 * con el tiempo el aporte propio crece. Eso requiere historia, no una sección.
 * Hasta que la historia exista, la sección se describe, no se puntúa.
 *
 * Mismo precedente anti-gamificación que `StudyDepthBadge`: un número visible
 * se convierte en la meta, y la meta pasa a ser el número en vez del sermón.
 */
export type SectionAuthorshipShape = 'vacia' | 'propia' | 'mixta' | 'seleccionada';

export function describeSectionAuthorship(elements: readonly SermonElement[]): SectionAuthorshipShape {
    const t = tallyProvenance(elements);
    if (t.inSermon === 0) return 'vacia';
    const suyos = t.pastor + t.editado;
    if (suyos === 0) return 'seleccionada';
    if (suyos === t.inSermon) return 'propia';
    return 'mixta';
}


/**
 * ¿El pastor decidió ALGO en esta sección? Completitud, no autoría.
 *
 * CUENTA LAS DIRECTIVAS. Una directiva es una decisión —"acá va el trasfondo
 * asirio"— aunque no sea una idea originada. Usar la autoría para medir avance
 * dejaba una sección llena de temas marcada como vacía en el mapa, y el pastor
 * veía un círculo donde acababa de trabajar.
 *
 * Son dos preguntas distintas y necesitan dos funciones distintas:
 * `describeSectionAuthorship` responde DE QUIÉN son las ideas;
 * ésta responde SI YA HAY algo decidido.
 */
export function hasDecisions(elements: readonly SermonElement[]): boolean {
    return elements.some((e) => e.provenance !== 'descartado');
}
