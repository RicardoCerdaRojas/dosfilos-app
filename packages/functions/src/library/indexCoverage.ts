/**
 * ¿El índice cubre el libro, o un pedazo del libro?
 *
 * La gramática de Wallace estaba indexada hasta la página 433 de 711.
 * Sin error, sin aviso, tarjeta verde, 696 chunks. La cadena tenía tres
 * eslabones y ninguno hablaba:
 *
 *   1. LlamaParse devolvió un `structured.md` de 18 KB para 711
 *      páginas: sólo los marcadores `<!-- page: N -->` y nada de texto.
 *      No falló — devolvió vacío.
 *   2. El indexador cayó a su fallback razonable: con menos de tres
 *      chunks, usar el `textContent` de Firestore.
 *   3. `textContent` está topado a 800.000 bytes por el límite de 1 MiB
 *      por documento. El libro no cabe y el corte cae donde caiga.
 *
 * Lo que lo hace peligroso es que el fallback FUNCIONA: produce chunks
 * con páginas reales y calidad normal. La única forma de verlo era
 * comparar el rango de páginas indexadas contra `pageCount` — dos
 * números que ya estaban en el documento y que nadie miraba.
 *
 * Este módulo es puro: mide y describe. Decidir qué hacer con la
 * medición es del indexador.
 */

/**
 * Desde qué cobertura se considera que el índice representa al libro.
 *
 * 0,9 y no 1: la última página suele ser el colofón o el índice, y un
 * chunker que la descarta no está perdiendo el libro. Por debajo de
 * esto ya no es un borde: falta un pedazo.
 */
export const INDEX_COVERAGE_MIN_RATIO = 0.9;

export interface IndexCoverage {
    /** Página más baja y más alta que quedaron en el índice. */
    firstIndexedPage: number;
    lastIndexedPage: number;
    /** Páginas que el documento declara tener. */
    pageCount: number;
    /** `lastIndexedPage / pageCount`, acotado a 1. */
    ratio: number;
    complete: boolean;
}

export function assessIndexCoverage(
    indexedPages: readonly number[],
    pageCount: number | null | undefined,
    minRatio: number = INDEX_COVERAGE_MIN_RATIO,
): IndexCoverage | null {
    const paginas = indexedPages.filter(p => Number.isFinite(p) && p > 0);
    if (paginas.length === 0) return null;
    // Sin `pageCount` no hay contra qué comparar. Se devuelve null antes
    // que inventar un denominador: un porcentaje falso es peor que
    // ninguno, porque parece medido.
    if (!pageCount || pageCount <= 0) return null;

    const lastIndexedPage = Math.max(...paginas);
    const ratio = Math.min(1, lastIndexedPage / pageCount);
    return {
        firstIndexedPage: Math.min(...paginas),
        lastIndexedPage,
        pageCount,
        ratio,
        complete: ratio >= minRatio,
    };
}

/** Aviso en lengua llana, o `null` cuando el índice cubre el libro. */
export function describeIndexCoverage(coverage: IndexCoverage | null): string | null {
    if (!coverage || coverage.complete) return null;
    const porcentaje = Math.round(coverage.ratio * 100);
    return `El índice llega hasta la página ${coverage.lastIndexedPage} de ${coverage.pageCount} (${porcentaje}%). `
        + 'Lo que está más allá no aparece en las búsquedas ni se puede citar. Reprocesa el documento con Premium.';
}

/**
 * Un `structured.md` con marcadores de página y sin texto entre ellos.
 *
 * Es una extracción VACÍA, no una exitosa. Devolver los rótulos de 711
 * páginas y ningún contenido pasaba por resultado bueno porque el
 * archivo existía y pesaba algo.
 */
export function isMarkerOnlyMarkdown(markdown: string): boolean {
    const marcadores = markdown.match(/<!--\s*page:\s*\d+\s*-->/gi);
    if (!marcadores || marcadores.length === 0) return false;
    const sinMarcadores = markdown.replace(/<!--\s*page:\s*\d+\s*-->/gi, '');
    // Un promedio de menos de veinte caracteres por página no es un
    // libro con páginas en blanco: es un archivo sin texto.
    return sinMarcadores.trim().length < marcadores.length * 20;
}
