import type { SectionMode } from './deriveSectionWalk';

/**
 * Dónde aterriza el contenido de una sección dentro del sermón.
 *
 * ES LA MITAD QUE FALTABA. La estructura del sermón estaba escrita DOS VECES:
 * el recorrido empujaba secciones a mano y el ensamblador mapeaba ids a campos
 * a mano. Agregar una sección obligaba a tocar las dos, y olvidar una no rompía
 * nada — la sección aparecía en el taller y su contenido no llegaba al sermón.
 *
 * Con el destino declarado en el catálogo, el ensamblador ya no conoce ningún
 * id: recorre las mismas definiciones que el taller.
 */
export type DraftTarget =
    | { kind: 'title' }
    /** Bloque de la introducción, con su encabezado y su orden. */
    | { kind: 'introduction'; headingKey: string }
    | { kind: 'conclusion' }
    | { kind: 'callToAction' }
    /** Cuerpo del punto: la prosa que lo desarrolla. */
    | { kind: 'pointContent' }
    | { kind: 'pointAuthorityQuote' }
    | { kind: 'pointIllustration' }
    | { kind: 'pointImplications' }
    | { kind: 'pointTransition' };

/**
 * De dónde sale el material que la sección ya trae hecho.
 *
 * Se declara como DATO y no como código en el recorrido para que agregar una
 * sección no obligue a editar un `if` en el medio de un bucle.
 */
export type CoveredSource =
    /** Las directivas del bosquejo: énfasis + notas exegéticas del punto. */
    | 'pointDirectives'
    /** La aplicación que el pastor escribió en el bosquejo. */
    | 'pointApplication'
    /** La proposición homilética del sermón. */
    | 'sermonProposition'
    /**
     * La proposición MÁS los puntos que anuncia.
     *
     * Fuente aparte de `sermonProposition` porque no todos los que usan la
     * proposición quieren el anuncio: el título se orienta con ella y sumarle
     * el bosquejo lo volvería un párrafo.
     */
    | 'sermonPropositionWithPoints'
    /** La anécdota que el pastor escribió en el paso 8. */
    | 'openingIllustration'
    /** Las palabras clave del estudio, con su significancia. */
    | 'studyKeyWords'
    /** El recordatorio que cierra la transición: proposición + puntos. */
    | 'transitionReminder';

export interface SectionDefinition {
    /** Sufijo del id. Con `scope: 'point'` se antepone `point.N.`. */
    key: string;
    /** Una vez por sermón, o una vez por cada punto del bosquejo. */
    scope: 'sermon' | 'point';
    mode: SectionMode;
    labelKey: string;
    jobKey: string;
    /** Dónde aterriza en el borrador. */
    target: DraftTarget;
    /** Material que la sección trae hecho, si lo hay. */
    coveredFrom?: CoveredSource;
    /** Clave i18n que introduce ese material. */
    contextKey?: string;
    /**
     * El material de origen ES el contenido de la sección, no sólo contexto.
     *
     * LA DISTINCIÓN NO ES SUTIL: la misma fuente puede ser una cosa u otra
     * según la sección. La proposición del sermón ES el contenido de la sección
     * "Proposición Homilética" y es sólo CONTEXTO en la del título, que existe
     * para que él escriba otra cosa. Y el recordatorio de la transición es
     * contexto: si entrara como contenido saldría dos veces, porque
     * `assembleTransitions` lo agrega después.
     */
    coveredIsContent?: boolean;
    /** Con material presente, la sección llega `cubierta` y no se pregunta. */
    coveredMeansDone?: boolean;
    /** Prefijo i18n del texto propio de una sección `verbatim`. */
    verbatimKey?: string;
    /** Una sola decisión, aunque ocupe varias frases. */
    oneIdea?: boolean;
    /** Sus movimientos salen de los conceptos de la proposición del punto. */
    unpacksProposition?: boolean;
    /** Muestra el texto bíblico del punto mientras se decide. */
    showsScripture?: boolean;
    /**
     * La sección puede quedar vacía sin que al sermón le falte nada.
     *
     * La cita de autoridad es el caso: existe SÓLO si el pastor tiene una
     * verificable. Contarla como pendiente lo empujaría a inventar una para
     * "completar" el sermón — que es justo el mecanismo por el que se fabrica
     * una cita falsa.
     */
    optional?: boolean;
}

const NS = 'drafting.sections';
const def = (d: SectionDefinition): SectionDefinition => d;

/**
 * LA ESTRUCTURA DEL SERMÓN, COMO DATO Y EN ORDEN DE RECORRIDO.
 *
 * El orden del arreglo ES el orden en que el pastor decide: cuerpo →
 * conclusión → introducción → título (ADR-037). La introducción escrita primero
 * sale genérica porque presenta algo que todavía no existe; el título nombra lo
 * que ya se dijo.
 *
 * AGREGAR UNA SECCIÓN ES AGREGAR UNA ENTRADA ACÁ. No hay que tocar el
 * recorrido, ni el mapa, ni el ensamblador: los tres leen esta lista. Antes
 * había que editar dos funciones y nada fallaba si se olvidaba una.
 */
export const SECTION_CATALOG: readonly SectionDefinition[] = [
    // ── Cuerpo: por cada punto del bosquejo ─────────────────────────────
    def({
        key: 'proposition',
        scope: 'point',
        mode: 'verbatim',
        labelKey: `${NS}.pointProposition.label`,
        jobKey: `${NS}.pointProposition.job`,
        verbatimKey: `${NS}.pointProposition.verbatim`,
        // ABRE el contenido del punto. La exposición aporta lo que la
        // desarrolla, y su prosa NO la repite: cada sección aporta sólo lo
        // suyo, que es lo que hace que concatenarlas no produzca duplicados.
        target: { kind: 'pointContent' },
        // Sus reflexiones del bosquejo son el insumo con que FORMA la frase.
        coveredFrom: 'pointDirectives',
        contextKey: `${NS}.directiveContext`,
        showsScripture: true,
    }),
    def({
        key: 'exposition',
        scope: 'point',
        mode: 'elements',
        labelKey: `${NS}.exposition.label`,
        jobKey: `${NS}.exposition.job`,
        target: { kind: 'pointContent' },
        unpacksProposition: true,
        showsScripture: true,
    }),
    def({
        key: 'authorityQuote',
        scope: 'point',
        mode: 'elements',
        labelKey: `${NS}.authorityQuote.label`,
        jobKey: `${NS}.authorityQuote.job`,
        target: { kind: 'pointAuthorityQuote' },
        optional: true,
        // UNA cita, no una lista: un punto se respalda con una voz, no con
        // varias apiladas.
        oneIdea: true,
    }),
    def({
        key: 'illustration',
        scope: 'point',
        mode: 'elements',
        labelKey: `${NS}.illustration.label`,
        jobKey: `${NS}.illustration.job`,
        target: { kind: 'pointIllustration' },
        oneIdea: true,
    }),
    def({
        key: 'application',
        scope: 'point',
        mode: 'elements',
        labelKey: `${NS}.application.label`,
        jobKey: `${NS}.application.job`,
        target: { kind: 'pointImplications' },
        coveredFrom: 'pointApplication',
        contextKey: `${NS}.coveredNote`,
        coveredMeansDone: true,
        coveredIsContent: true,
    }),
    def({
        key: 'transition',
        scope: 'point',
        mode: 'elements',
        labelKey: `${NS}.transition.label`,
        jobKey: `${NS}.transition.job`,
        target: { kind: 'pointTransition' },
        // El recordatorio SE MUESTRA aunque se componga solo: marcarla resuelta
        // sin enseñar el texto cambia un pendiente falso por un "listo" mudo.
        // Y sigue pudiendo escribir el puente retórico, que es lo único suyo
        // acá — `assembleTransitions` lo conserva y le agrega el recordatorio.
        // TODO PUNTO LLEVA TRANSICIÓN, incluido el último. Asumí que no —
        // "después viene la conclusión, no otro movimiento"— y el fundador lo
        // corrigió: él la hace siempre. Lo que cambia en el último no es que
        // exista, sino su contenido: no hay lista de puntos que retomar, así
        // que el puente a la conclusión lo escribe él.
        coveredFrom: 'transitionReminder',
        contextKey: `${NS}.transitionContext`,
        coveredMeansDone: true,
        oneIdea: true,
    }),

    // ── Conclusión ──────────────────────────────────────────────────────
    def({
        key: 'conclusion.recap',
        scope: 'sermon',
        mode: 'elements',
        labelKey: `${NS}.recap.label`,
        jobKey: `${NS}.recap.job`,
        target: { kind: 'conclusion' },
    }),
    def({
        key: 'conclusion.callToAction',
        scope: 'sermon',
        mode: 'elements',
        labelKey: `${NS}.callToAction.label`,
        jobKey: `${NS}.callToAction.job`,
        target: { kind: 'callToAction' },
    }),

    // ── Introducción: mismo orden que producía el generador clásico ─────
    def({
        key: 'introduction.openingIllustration',
        scope: 'sermon',
        mode: 'elements',
        labelKey: `${NS}.openingIllustration.label`,
        jobKey: `${NS}.openingIllustration.job`,
        target: { kind: 'introduction', headingKey: `${NS}.openingIllustration.heading` },
        coveredFrom: 'openingIllustration',
        contextKey: `${NS}.coveredNote`,
        coveredMeansDone: true,
        oneIdea: true,
        coveredIsContent: true,
    }),
    def({
        key: 'introduction.bookOverview',
        scope: 'sermon',
        mode: 'elements',
        labelKey: `${NS}.bookOverview.label`,
        jobKey: `${NS}.bookOverview.job`,
        target: { kind: 'introduction', headingKey: `${NS}.bookOverview.heading` },
    }),
    def({
        key: 'introduction.historicalContext',
        scope: 'sermon',
        mode: 'elements',
        labelKey: `${NS}.historicalContext.label`,
        jobKey: `${NS}.historicalContext.job`,
        target: { kind: 'introduction', headingKey: `${NS}.historicalContext.heading` },
        // SIN `coveredFrom: 'studyKeyWords'`. Las palabras clave del estudio se
        // mostraban acá como "indicaciones para esta sección" porque era el
        // ÚNICO camino por el que llegaban a la redacción — un injerto, no una
        // pertenencia: el estudio léxico no es contexto histórico, y el
        // fundador lo señaló en cuanto lo vio. Hoy tienen sus lugares propios:
        // la hoja "Ver estudio" (lectura) y su bloque por punto (decisión).
    }),
    def({
        key: 'introduction.currentConnection',
        scope: 'sermon',
        mode: 'elements',
        labelKey: `${NS}.currentConnection.label`,
        jobKey: `${NS}.currentConnection.job`,
        target: { kind: 'introduction', headingKey: `${NS}.currentConnection.heading` },
    }),
    def({
        key: 'introduction.proposition',
        scope: 'sermon',
        mode: 'verbatim',
        labelKey: `${NS}.sermonProposition.label`,
        jobKey: `${NS}.sermonProposition.job`,
        verbatimKey: `${NS}.sermonProposition.verbatim`,
        target: { kind: 'introduction', headingKey: `${NS}.sermonProposition.heading` },
        // La escribió en el paso homilético: se muestra, no se vuelve a pedir.
        // CON LOS PUNTOS QUE ANUNCIA. Enunciar la tesis y enseguida las
        // divisiones es lo que hace el predicador al terminar la introducción;
        // la proposición sola deja al oyente sin saber por dónde va el sermón.
        coveredFrom: 'sermonPropositionWithPoints',
        contextKey: `${NS}.coveredNote`,
        coveredMeansDone: true,
        coveredIsContent: true,
    }),

    // ── Título: nombra lo que ya se dijo, por eso va al final ────────────
    def({
        key: 'title',
        scope: 'sermon',
        mode: 'verbatim',
        labelKey: `${NS}.title.label`,
        jobKey: `${NS}.title.job`,
        verbatimKey: `${NS}.title.verbatim`,
        target: { kind: 'title' },
        // La proposición orienta el título sin sustituirlo: no lo da por hecho.
        coveredFrom: 'sermonProposition',
        contextKey: `${NS}.title.context`,
    }),
];

/** `point.2.exposition` para las de punto, `title` para las del sermón. */
export function sectionIdFor(definition: SectionDefinition, pointNumber?: number): string {
    return definition.scope === 'point' ? `point.${pointNumber}.${definition.key}` : definition.key;
}
