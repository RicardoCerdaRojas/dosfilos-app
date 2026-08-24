const MARCADOR = /^\s*(?:[-*•–—]|\d+[.)])\s*/;

/**
 * Parte lo que el pastor escribió en el campo de ideas: UNA IDEA POR LÍNEA.
 *
 * DELIBERADAMENTE DISTINTO DE `splitApplication`, y la diferencia no es un
 * descuido: allá un salto simple NO parte, porque las aplicaciones son prosa
 * larga y un Enter suele ser alguien cortando una frase para leerla mejor.
 * Acá los elementos son de una o dos frases, y entre dos líneas cortas el Enter
 * es un acto deliberado — es como se escribe una lista.
 *
 * Suponer que escribe de a una y pulsa el botón cada vez convierte en tedio lo
 * que él hace natural: tirar la lista de un tirón. Elegir una convención y
 * suponer que es la del usuario es el error que ya se cometió una vez.
 *
 * Las viñetas se limpian: si las escribió, marcan estructura, no contenido.
 */
export function splitElementLines(raw: string | undefined): string[] {
    if (!raw?.trim()) return [];
    return raw
        .split(/\r?\n/)
        .map((linea) => linea.replace(MARCADOR, '').trim())
        .filter((linea) => linea.length > 0);
}
