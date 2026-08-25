/**
 * De qué pasaje habla un punto del bosquejo.
 *
 * MANDA EL TÍTULO, NO `scriptureReferences`. Los títulos los escribe y reescribe
 * el pastor —"II. El hombre desobedece y revela su necedad (vv. 3)"—; las
 * referencias vienen de la propuesta del generador y NO SE MUESTRAN EN NINGUNA
 * PANTALLA del flujo, así que quedan como llegaron aunque él cambie el punto.
 *
 * El caso real (2026-08-24): su título decía "(vv. 3)" y la referencia heredada
 * seguía diciendo "Jonás 1:3a", del bosquejo de tres puntos que él ya había
 * reemplazado. No estaban en conflicto por error suyo: uno lo mantiene él y el
 * otro nadie.
 *
 * REGLA GENERAL: entre un campo que el usuario mantiene y uno que el generador
 * dejó, gana el que él mantiene.
 *
 * `scriptureReferences[0]` queda como respaldo para los títulos que no llevan
 * versículo entre paréntesis.
 */
const VERSICULOS_EN_TITULO = /\(\s*vv?\.?\s*([\d]+(?:\s*[-–]\s*[\d]+)?[a-cA-C]?)\s*\)/i;

/** "Jonás 1:1-3" → "Jonás 1". Sirve para completar el "vv. 3" del título. */
function libroYCapitulo(passage: string | undefined): string | undefined {
    const limpio = passage?.trim();
    if (!limpio) return undefined;
    const m = limpio.match(/^(.+?\s+\d+)\s*[:.]/);
    return m?.[1]?.trim();
}

export function pointPassageRef(input: {
    /** Título del punto, tal como lo mantiene el pastor. */
    title?: string;
    /** Pasaje del sermón completo, para completar libro y capítulo. */
    sermonPassage?: string;
    /** Referencias del bosquejo. La primera es el respaldo. */
    scriptureReferences?: readonly string[];
}): string | undefined {
    const versiculos = input.title?.match(VERSICULOS_EN_TITULO)?.[1];
    const base = libroYCapitulo(input.sermonPassage);
    if (versiculos && base) {
        return `${base}:${versiculos.replace(/\s+/g, '')}`;
    }
    return input.scriptureReferences?.[0]?.trim() || undefined;
}
