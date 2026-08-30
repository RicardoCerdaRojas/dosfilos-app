import type { ProjectSource, SheetRange } from '../entities/ProjectSource';

/**
 * ¿Los fragmentos guardados de una fuente corresponden a su receta?
 *
 * Los dos campos describen lo mismo desde dos lados: la receta dice qué hojas
 * pidió el usuario, los `excerpts` son el texto que se materializó de ahí. Que
 * se contradigan significa que se escribieron en momentos distintos o por
 * caminos distintos, y a partir de ahí todo lo que se calcule sobre la fuente
 * —el presupuesto, sobre todo— habla de algo que no existe.
 *
 * Pasó en producción: una fuente con receta de hojas 5, 11-18, 105-117 y
 * 121-132 tenía guardados 25 fragmentos de las hojas 17, 18 y 106-118. Ni
 * subconjunto ni superconjunto: otro conjunto. El medidor sumaba una cosa y el
 * prompt recibía otra, y desde afuera no había forma de notarlo.
 *
 * La comprobación es barata y local: cada `excerpt` lleva su hoja en el ancla
 * de citación (`p. 118, § …`), así que alcanza con ver si cae dentro de algún
 * tramo de la receta. No detecta lo que FALTA —para eso hace falta el índice
 * de hojas— pero sí lo que sobra, que es la señal de que los dos campos se
 * separaron.
 */

export interface RecipeConsistency {
    /** `false` cuando hay fragmentos fuera de los tramos declarados. */
    consistent: boolean;
    /** Fragmentos cuya hoja no cae en ningún tramo de la receta. */
    strayExcerpts: number;
    /** Hojas de esos fragmentos, ordenadas, para poder decirlo con precisión. */
    straySheets: number[];
}

/** Lee la hoja del ancla de citación: `p. 118, § Escena 4` → 118. */
export function sheetFromSourceLocation(sourceLocation: string): number | null {
    const match = sourceLocation.match(/(?:^|\s)p\.\s*(\d+)/);
    if (!match?.[1]) return null;
    const sheet = Number(match[1]);
    return Number.isInteger(sheet) && sheet >= 1 ? sheet : null;
}

function withinRanges(sheet: number, ranges: ReadonlyArray<SheetRange>): boolean {
    return ranges.some(r => sheet >= r.start && sheet <= r.end);
}

export function checkRecipeConsistency(
    source: Pick<ProjectSource, 'excerpts' | 'excerptRecipe'>,
): RecipeConsistency {
    const ranges = source.excerptRecipe?.sheetRanges;
    // Sin receta no hay nada que contradecir: son las fuentes anteriores al
    // selector, y sobre esas la interfaz no afirma nada.
    if (!ranges || ranges.length === 0) {
        return { consistent: true, strayExcerpts: 0, straySheets: [] };
    }

    const stray = new Set<number>();
    let count = 0;
    for (const excerpt of source.excerpts) {
        const sheet = sheetFromSourceLocation(excerpt.sourceLocation);
        // Un fragmento sin ancla legible no acusa a nadie: puede venir de un
        // documento cuyos chunks no traen página.
        if (sheet === null) continue;
        if (!withinRanges(sheet, ranges)) {
            stray.add(sheet);
            count++;
        }
    }

    return {
        consistent: count === 0,
        strayExcerpts: count,
        straySheets: [...stray].sort((a, b) => a - b),
    };
}
