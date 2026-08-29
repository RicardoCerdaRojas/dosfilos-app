/**
 * Cómo se busca en el texto bíblico.
 *
 * DOS DECISIONES, LAS DOS POR EL ESPAÑOL Y POR CÓMO SE BUSCA DE VERDAD:
 *
 * 1. LOS ACENTOS NO CUENTAN. Quien busca en una tablet escribe "ninive" y
 *    espera encontrar "Nínive". Comparar tal cual convierte la tilde en una
 *    trampa: el texto la tiene siempre y el que escribe casi nunca.
 *
 * 2. LAS PALABRAS SE BUSCAN TODAS, NO LA FRASE EXACTA. "Jonás Nínive" tiene
 *    que encontrar el versículo que menciona las dos cosas aunque estén
 *    separadas por media línea. Buscar la cadena entera sólo sirve cuando uno
 *    recuerda la frase palabra por palabra, que es el caso raro.
 */

/**
 * Pasa un texto a su forma comparable: minúsculas y sin diacríticos.
 *
 * SE PLIEGA CARÁCTER POR CARÁCTER PARA CONSERVAR LAS POSICIONES. Normalizar la
 * cadena entera con NFD la alarga —cada letra acentuada pasa a ser dos— y
 * entonces los índices del texto plegado ya no sirven para resaltar sobre el
 * original. Si un carácter no se reduce a uno solo, se deja como está: es
 * preferible no plegarlo que descolocar todo lo que viene después.
 */
export function foldForSearch(text: string): string {
    let folded = '';
    for (const char of text) {
        const stripped = char.normalize('NFD').replace(/[̀-ͯ]/g, '');
        folded += (stripped.length === 1 ? stripped : char).toLowerCase();
    }
    return folded;
}

/** Los términos de una consulta, sin vacíos. */
export function searchTerms(query: string): string[] {
    return foldForSearch(query)
        .split(/\s+/)
        .filter((term) => term.length > 0);
}

export interface MatchRange {
    start: number;
    end: number;
}

/**
 * Dónde cae cada término dentro del texto, para poder resaltarlo.
 *
 * Devuelve lista vacía si falta alguno: la coincidencia es de TODOS los
 * términos, no de cualquiera. Los rangos salen ordenados y sin solaparse, que
 * es lo que necesita quien los va a pintar.
 */
export function matchRanges(text: string, query: string): MatchRange[] {
    const terms = searchTerms(query);
    if (!terms.length) return [];

    const folded = foldForSearch(text);
    const ranges: MatchRange[] = [];

    for (const term of terms) {
        let found = false;
        let from = folded.indexOf(term);
        while (from !== -1) {
            ranges.push({ start: from, end: from + term.length });
            found = true;
            from = folded.indexOf(term, from + term.length);
        }
        // Falta uno: el versículo no cumple y no hay nada que resaltar.
        if (!found) return [];
    }

    ranges.sort((a, b) => a.start - b.start);

    const merged: MatchRange[] = [];
    for (const range of ranges) {
        const last = merged[merged.length - 1];
        if (last && range.start <= last.end) {
            last.end = Math.max(last.end, range.end);
        } else {
            merged.push({ ...range });
        }
    }
    return merged;
}

/** ¿El texto contiene todos los términos? */
export function matchesQuery(text: string, query: string): boolean {
    return matchRanges(text, query).length > 0;
}

/** Parte el texto en tramos, marcando cuáles coinciden. */
export function splitByMatches(
    text: string,
    ranges: MatchRange[],
): { text: string; match: boolean }[] {
    if (!ranges.length) return [{ text, match: false }];
    const parts: { text: string; match: boolean }[] = [];
    let cursor = 0;
    for (const range of ranges) {
        if (range.start > cursor) {
            parts.push({ text: text.slice(cursor, range.start), match: false });
        }
        parts.push({ text: text.slice(range.start, range.end), match: true });
        cursor = range.end;
    }
    if (cursor < text.length) parts.push({ text: text.slice(cursor), match: false });
    return parts;
}
