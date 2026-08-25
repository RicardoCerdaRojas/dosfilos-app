import { pointPassageRef } from './pointPassageRef';
import { buildTransitionReminder } from '../sermon-judge/assembleTransitions';
import { SECTION_CATALOG, sectionIdFor, type CoveredSource, type SectionDefinition } from './sectionCatalog';

/**
 * Deriva el RECORRIDO de secciones desde el bosquejo real del pastor.
 *
 * No hay lista fija: dos puntos producen un recorrido y tres producen otro.
 * Fijarla obligaría a inventar secciones que su sermón no tiene, o a callar las
 * que sí.
 *
 * LA ESTRUCTURA VIVE EN `SECTION_CATALOG`, NO ACÁ. Este módulo sólo la
 * instancia contra el bosquejo: repite las de punto, resuelve el material que
 * cada una ya trae hecho, y calcula su estado. Agregar una sección es agregar
 * una entrada al catálogo — antes había que editar esta función Y el
 * ensamblador, y olvidar uno de los dos no rompía nada.
 */

/** Qué hacer con la sección cuando el pastor llega a ella. */
export type SectionStatus =
    /** Hay que decidir ideas. */
    | 'pendiente'
    /**
     * Ya es suya: viene del estudio o del bosquejo. SE MUESTRA, NO SE PREGUNTA.
     *
     * Re-preguntar lo ya decidido es la forma más rápida de que abandone el
     * flujo — y le pediría decidir dos veces la misma cosa, con el riesgo de
     * que la segunda contradiga a la primera.
     */
    | 'cubierta';

/** Cómo se decide la sección. */
export type SectionMode = 'elements' | 'verbatim';

export interface WalkSection {
    id: string;
    mode: SectionMode;
    labelKey: string;
    jobKey: string;
    labelParams?: Record<string, string | number>;
    status: SectionStatus;
    /** Lo que el pastor ya escribió y alimenta esta sección. */
    coveredBy?: string[];
    /** Clave i18n que introduce `coveredBy`. */
    contextKey?: string;
    /** Prefijo i18n del texto propio de una sección `verbatim`. */
    verbatimKey?: string;
    /** Una sola decisión, aunque ocupe varias frases. */
    oneIdea?: boolean;
    /** Sus movimientos salen de los conceptos de la proposición del punto. */
    unpacksProposition?: boolean;
    /** Referencia del pasaje que esta sección expone, si aplica. */
    scriptureRef?: string;
    /** Agrupa las secciones de un punto bajo él, para el mapa lateral. */
    parentId?: string;
    /** Título del punto, verbatim. */
    parentLabel?: string;
    /** La definición de la que salió. El ensamblador lee su `target`. */
    definition: SectionDefinition;
}

export interface WalkOutlinePoint {
    title?: string;
    application?: string;
    pastorDirective?: {
        emphasis?: string;
        exegeticalNotes?: string[];
    };
    /**
     * Referencias del punto. LA PRIMERA es el pasaje que expone; las demás son
     * cruzadas. Sólo se usa como respaldo: manda el versículo del título.
     */
    scriptureReferences?: string[];
}

/** Palabra clave del estudio, con la significancia que el pastor le dio. */
export interface WalkKeyWord {
    original?: string;
    significance?: string;
}

export interface WalkInput {
    points: readonly WalkOutlinePoint[];
    /** Pasaje del sermón completo. Completa el "vv. 3" de los títulos. */
    sermonPassage?: string;
    /** Proposición homilética, verbatim. */
    proposition?: string;
    /** Ilustración de apertura, si la escribió en el paso 8. */
    openingIllustration?: string;
    /** Palabras clave del estudio de ocho pasos. */
    keyWords?: readonly WalkKeyWord[];
}

function limpiar(textos: (string | undefined)[]): string[] {
    return textos.map((t) => t?.trim()).filter((t): t is string => Boolean(t));
}

/** Resuelve el material que una sección trae hecho, según su `coveredFrom`. */
function resolverCubierto(
    fuente: CoveredSource | undefined,
    input: WalkInput,
    punto: WalkOutlinePoint | undefined,
): string[] {
    switch (fuente) {
        case 'pointDirectives':
            return limpiar([
                punto?.pastorDirective?.emphasis,
                ...(punto?.pastorDirective?.exegeticalNotes ?? []),
            ]);
        case 'pointApplication':
            return limpiar([punto?.application]);
        case 'sermonProposition':
            return limpiar([input.proposition]);
        case 'openingIllustration':
            return limpiar([input.openingIllustration]);
        case 'transitionReminder': {
            // El último punto SÍ lleva transición, pero no recordatorio: no hay
            // otro punto al que apuntar. Ahí el puente a la conclusión lo
            // escribe el pastor, y por eso la sección le queda pendiente.
            const titulos = input.points.map((p) => p.title?.trim()).filter((t): t is string => Boolean(t));
            const proposicion = input.proposition?.trim();
            const esUltimo = punto ? input.points[input.points.length - 1] === punto : false;
            if (!proposicion || titulos.length === 0 || esUltimo) return [];
            return [buildTransitionReminder(proposicion, titulos)];
        }
        case 'studyKeyWords':
            // Original + significancia en una línea: el pastor decidió qué
            // significa la palabra, y esa nota es lo que alimenta la sección.
            return limpiar(
                (input.keyWords ?? []).map((k) =>
                    k.significance?.trim() ? `${k.original ?? ''} — ${k.significance}`.trim() : undefined,
                ),
            );
        default:
            return [];
    }
}

export function deriveSectionWalk(input: WalkInput): WalkSection[] {
    const secciones: WalkSection[] = [];

    const instanciar = (definicion: SectionDefinition, punto?: WalkOutlinePoint, n?: number): WalkSection => {
        const cubierto = resolverCubierto(definicion.coveredFrom, input, punto);
        const tieneCubierto = cubierto.length > 0;
        // El título manda sobre `scriptureReferences`: uno lo mantiene el
        // pastor, el otro quedó de la propuesta del generador.
        const refPunto = punto
            ? pointPassageRef({
                  title: punto.title,
                  sermonPassage: input.sermonPassage,
                  scriptureReferences: punto.scriptureReferences,
              })
            : undefined;

        return {
            id: sectionIdFor(definicion, n),
            mode: definicion.mode,
            labelKey: definicion.labelKey,
            jobKey: definicion.jobKey,
            labelParams: n !== undefined ? { n } : undefined,
            status: definicion.coveredMeansDone && tieneCubierto ? 'cubierta' : 'pendiente',
            coveredBy: tieneCubierto ? cubierto : undefined,
            contextKey: tieneCubierto ? definicion.contextKey : undefined,
            verbatimKey: definicion.verbatimKey,
            oneIdea: definicion.oneIdea,
            unpacksProposition: definicion.unpacksProposition,
            scriptureRef: definicion.showsScripture ? refPunto : undefined,
            parentId: punto ? `point.${n}` : undefined,
            parentLabel: punto?.title?.trim() || undefined,
            definition: definicion,
        };
    };

    const dePunto = SECTION_CATALOG.filter((d) => d.scope === 'point');
    const deSermon = SECTION_CATALOG.filter((d) => d.scope === 'sermon');

    // Las de punto se repiten por cada punto, conservando el orden del catálogo
    // dentro de cada uno: primero se decide el punto entero y después el
    // siguiente, que es como el pastor piensa un sermón.
    input.points.forEach((punto, i) => {
        for (const definicion of dePunto) secciones.push(instanciar(definicion, punto, i + 1));
    });

    for (const definicion of deSermon) secciones.push(instanciar(definicion));

    return secciones;
}

/** Secciones que todavía piden decisiones. */
export function pendingSections(walk: readonly WalkSection[]): WalkSection[] {
    return walk.filter((s) => s.status === 'pendiente');
}
