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
    /** La anécdota que el pastor escribió en el paso 8. */
    | 'openingIllustration'
    /** Las palabras clave del estudio, con su significancia. */
    | 'studyKeyWords';

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
     * La sección no se decide: se deriva de lo que ya existe.
     *
     * La transición es el caso — retomar la proposición y nombrar el punto
     * siguiente es mecánico. Preguntarla sería fricción sin contenido, que es
     * justo lo que la definición de elemento descarta.
     */
    derived?: boolean;
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
    }),
    def({
        key: 'transition',
        scope: 'point',
        mode: 'elements',
        labelKey: `${NS}.transition.label`,
        jobKey: `${NS}.transition.job`,
        target: { kind: 'pointTransition' },
        derived: true,
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
        coveredFrom: 'studyKeyWords',
        contextKey: `${NS}.keyWordsContext`,
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
        coveredFrom: 'sermonProposition',
        contextKey: `${NS}.coveredNote`,
        coveredMeansDone: true,
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
