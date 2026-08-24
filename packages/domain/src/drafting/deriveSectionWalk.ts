/**
 * Deriva el RECORRIDO de secciones desde el bosquejo real del pastor.
 *
 * No hay lista fija de secciones: dos puntos producen un recorrido y tres
 * producen otro. Fijarla obligaría a inventar secciones que su sermón no tiene,
 * o a callar las que sí.
 */

/** Qué hacer con la sección cuando el pastor llega a ella. */
export type SectionStatus =
    /** Hay que decidir ideas. */
    | 'pendiente'
    /**
     * Ya es suya: viene del estudio o del bosquejo. SE MUESTRA, NO SE PREGUNTA.
     *
     * Re-preguntar lo ya decidido es la forma más rápida de que abandone el
     * flujo — y además le pediría que decida dos veces la misma cosa, con el
     * riesgo de que la segunda contradiga a la primera.
     */
    | 'cubierta';

export interface WalkSection {
    id: string;
    /** Clave i18n de la etiqueta. El dominio no habla ningún idioma. */
    labelKey: string;
    /** Clave i18n del trabajo que la sección tiene que hacer. */
    jobKey: string;
    /** Parámetros de interpolación (p. ej. el número del punto). */
    labelParams?: Record<string, string | number>;
    status: SectionStatus;
    /** Lo que el pastor ya escribió y cubre esta sección. Se muestra tal cual. */
    coveredBy?: string[];
    /** Agrupa las secciones de un punto bajo él, para el mapa lateral. */
    parentId?: string;
    /** Título del punto, verbatim. Sólo en las secciones que SON un punto. */
    parentLabel?: string;
}

/** Forma mínima que este módulo necesita del bosquejo. No importa la entidad entera. */
export interface WalkOutlinePoint {
    title?: string;
    application?: string;
    pastorDirective?: {
        emphasis?: string;
        exegeticalNotes?: string[];
    };
}

export interface WalkInput {
    points: readonly WalkOutlinePoint[];
    /** Ilustración de apertura, si el pastor ya la escribió en el paso 8. */
    openingIllustration?: string;
    /** Proposición homilética, verbatim. */
    proposition?: string;
}

const NS = 'drafting.sections';

function cubierta(textos: (string | undefined)[]): string[] {
    return textos.map((t) => t?.trim()).filter((t): t is string => Boolean(t));
}

/**
 * ORDEN INVERSO: cuerpo → conclusión → introducción → título (ADR-037).
 *
 * La introducción escrita primero sale genérica, porque presenta algo que
 * todavía no existe; el título nombra lo que ya se dijo. La excepción es la
 * ilustración de apertura, que el pastor escribe deliberadamente en el paso 8
 * antes de tener puntos — por eso llega `cubierta` y no se le vuelve a pedir.
 */
export function deriveSectionWalk(input: WalkInput): WalkSection[] {
    const secciones: WalkSection[] = [];

    input.points.forEach((punto, i) => {
        const n = i + 1;
        const parentId = `point.${n}`;
        const parentLabel = punto.title?.trim() || undefined;
        const base = { parentId, parentLabel };

        // La exposición SIEMPRE se pregunta: es el contenido del punto.
        // Sus directivas del bosquejo viajan como contexto —no como respuesta—,
        // porque una directiva dice QUÉ cubrir y la exposición es la idea que lo
        // cubre. Confundirlas dejaría el punto sin contenido decidido.
        secciones.push({
            ...base,
            id: `${parentId}.exposition`,
            labelKey: `${NS}.exposition.label`,
            jobKey: `${NS}.exposition.job`,
            labelParams: { n },
            status: 'pendiente',
            coveredBy: cubierta([
                punto.pastorDirective?.emphasis,
                ...(punto.pastorDirective?.exegeticalNotes ?? []),
            ]),
        });

        secciones.push({
            ...base,
            id: `${parentId}.illustration`,
            labelKey: `${NS}.illustration.label`,
            jobKey: `${NS}.illustration.job`,
            labelParams: { n },
            status: 'pendiente',
        });

        // La aplicación del punto ya la escribió él en el paso homilético.
        const aplicacion = cubierta([punto.application]);
        secciones.push({
            ...base,
            id: `${parentId}.application`,
            labelKey: `${NS}.application.label`,
            jobKey: `${NS}.application.job`,
            labelParams: { n },
            status: aplicacion.length > 0 ? 'cubierta' : 'pendiente',
            coveredBy: aplicacion.length > 0 ? aplicacion : undefined,
        });
    });

    secciones.push({
        id: 'conclusion.recap',
        labelKey: `${NS}.recap.label`,
        jobKey: `${NS}.recap.job`,
        status: 'pendiente',
    });
    secciones.push({
        id: 'conclusion.callToAction',
        labelKey: `${NS}.callToAction.label`,
        jobKey: `${NS}.callToAction.job`,
        status: 'pendiente',
    });

    const apertura = cubierta([input.openingIllustration]);
    secciones.push({
        id: 'introduction.openingIllustration',
        labelKey: `${NS}.openingIllustration.label`,
        jobKey: `${NS}.openingIllustration.job`,
        status: apertura.length > 0 ? 'cubierta' : 'pendiente',
        coveredBy: apertura.length > 0 ? apertura : undefined,
    });
    secciones.push({
        id: 'introduction.bookOverview',
        labelKey: `${NS}.bookOverview.label`,
        jobKey: `${NS}.bookOverview.job`,
        status: 'pendiente',
    });
    secciones.push({
        id: 'introduction.historicalContext',
        labelKey: `${NS}.historicalContext.label`,
        jobKey: `${NS}.historicalContext.job`,
        status: 'pendiente',
    });

    // El título nombra lo que ya se dijo, así que va al final — y si la
    // proposición ya está escrita, no hay nada que decidir acá.
    const prop = cubierta([input.proposition]);
    secciones.push({
        id: 'title',
        labelKey: `${NS}.title.label`,
        jobKey: `${NS}.title.job`,
        status: prop.length > 0 ? 'cubierta' : 'pendiente',
        coveredBy: prop.length > 0 ? prop : undefined,
    });

    return secciones;
}

/** Secciones que todavía piden decisiones. */
export function pendingSections(walk: readonly WalkSection[]): WalkSection[] {
    return walk.filter((s) => s.status === 'pendiente');
}
