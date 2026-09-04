/**
 * Reetiqueta las menciones de página que el análisis dejó escritas
 * DENTRO de su prosa.
 *
 * El análisis guarda dos cosas distintas: referencias ESTRUCTURADAS
 * (`{ sourceKey, page }`) y prosa libre. Las estructuradas ya pasan por
 * el rótulo de página del compositor. La prosa no, y el modelo que
 * analiza el versículo escribe cosas como «Adamson (p. 59) lo conecta
 * con…» copiando el número de hoja que tenía a la vista. El compositor
 * lee esa prosa y arrastra el número tal cual.
 *
 * El resultado medido sobre un paper real: doce citas estructuradas
 * correctas y dos menciones en prosa mal — la misma hoja de Adamson
 * apareciendo como «p. 59» en el cuerpo y como «p. 55» en la cita
 * formal del mismo párrafo. Dos números para la misma página, y el
 * lector no tiene cómo saber cuál abrir.
 *
 * Regla de atribución: una mención se reetiqueta sólo si se puede
 * decir de QUIÉN es, buscando hacia atrás la clave citable más
 * cercana. Una mención que no se puede atribuir se deja intacta: es
 * preferible un número sin convertir a uno convertido con el desfase
 * del libro equivocado, porque el segundo manda al lector a una página
 * real que no dice lo que la cita afirma.
 */

/**
 * Cuánto se mira hacia atrás para encontrar de quién es la página.
 *
 * Cubre las dos formas que aparecen en la práctica —«Adamson (p. 59)»
 * y «(Adamson, *The Epistle of James*, p. 55)»— sin llegar a la
 * oración anterior, donde la clave más cercana ya no es la dueña de la
 * mención.
 */
const ATTRIBUTION_WINDOW = 120;

/**
 * Una mención de página en prosa. `pp.` queda fuera a propósito: marca
 * un rango, y convertir sólo el primer número de un rango produce un
 * intervalo que no existe.
 */
const PAGE_MENTION = /\bp(?:ág|ag)?s?\.\s*(\d{1,4})\b/gi;

export function relabelProsePages(
    text: string,
    citableKeys: readonly string[],
    page: (sourceKey: string, sheet: number) => string,
): string {
    if (!text || citableKeys.length === 0) return text;

    const out: string[] = [];
    let cursor = 0;
    PAGE_MENTION.lastIndex = 0;

    for (let m = PAGE_MENTION.exec(text); m; m = PAGE_MENTION.exec(text)) {
        const sheet = Number(m[1]);
        // La ventana arranca donde terminó la mención anterior: dos
        // páginas seguidas no comparten dueño por cercanía.
        const from = Math.max(cursor, m.index - ATTRIBUTION_WINDOW);
        const key = lastKeyIn(text.slice(from, m.index), citableKeys);

        out.push(text.slice(cursor, m.index));
        out.push(key && Number.isFinite(sheet) ? page(key, sheet) : m[0]);
        cursor = m.index + m[0].length;
    }

    if (cursor === 0) return text;
    out.push(text.slice(cursor));
    return out.join('');
}

/** La clave citable que aparece más cerca del final del fragmento. */
function lastKeyIn(window: string, citableKeys: readonly string[]): string | null {
    let best: string | null = null;
    let bestAt = -1;

    for (const key of citableKeys) {
        if (!key.trim()) continue;
        const at = window.toLowerCase().lastIndexOf(key.toLowerCase());
        if (at === -1) continue;
        // Frontera de palabra a mano: `escapeRegExp` sobre claves que
        // traen guiones («Nestle-Aland») complica más de lo que
        // resuelve, y esto es lo mismo con dos comparaciones.
        if (isWordChar(window[at - 1]) || isWordChar(window[at + key.length])) continue;
        if (at > bestAt) {
            bestAt = at;
            best = key;
        }
    }

    return best;
}

function isWordChar(char: string | undefined): boolean {
    return char !== undefined && /[\p{L}\p{N}]/u.test(char);
}
