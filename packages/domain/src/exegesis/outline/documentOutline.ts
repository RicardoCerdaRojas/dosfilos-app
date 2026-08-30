import {
    findBooksByAlias,
    getBookById,
    type BibleBookId,
} from '../../bible/canon/BibleCanon';
import {
    parsePassageReference,
    type PassageReference,
} from '../../bible/canon/passage-reference';

/**
 * Selección ESTRUCTURAL de fragmentos: qué parte de un comentario habla
 * del pasaje que se está estudiando.
 *
 * El camino que ya existía es semántico — se arma una query de embeddings
 * con la referencia ("Jonás 1:1-3") y se traen los K chunks más cercanos.
 * Funciona, pero devuelve fragmentos sueltos y aproximados: nada garantiza
 * que sea la sección del comentario dedicada al pasaje, ni que venga
 * completa, ni en orden.
 *
 * Un comentario, en cambio, YA está organizado por referencia. El indexador
 * guarda el encabezado de cada chunk (`section`) y su miga de pan
 * (`sectionPath`). En un libro bien extraído eso se ve así:
 *
 *   section     = "Micah 4:8"
 *   sectionPath = ["Micah", "Introduction", ..., "Micah 4:8"]
 *
 * O sea: la tabla de contenidos del libro es un índice por referencia
 * bíblica que ya está en la base. Este módulo lo lee.
 *
 * Tres pasos, todos puros:
 *   1. `resolveOutlineReferences` — recorre el esquema en orden y le asigna
 *      a cada chunk la referencia de su encabezado, heredándola hacia
 *      adelante hasta el siguiente encabezado (el cuerpo del comentario
 *      pertenece a la sección que lo encabeza).
 *   2. `selectChunksForPassage` — se queda con los chunks cuya referencia
 *      solapa el pasaje del trabajo, en tramos contiguos.
 *   3. `outlineStructureQuality` — mide si el libro tiene estructura
 *      utilizable. Cuando no la tiene, el llamador cae al camino semántico
 *      en vez de devolver nada.
 *
 * El paso 3 no es defensivo de más: de los cuatro comentarios del primer
 * paper real que se midió, dos traían encabezados por referencia y dos
 * traían `section: null` en todos sus chunks — misma versión de indexador,
 * distinta calidad de extracción del PDF.
 */

/** Una entrada del esquema: un chunk y dónde vive dentro del documento. */
export interface DocumentOutlineEntry {
    chunkIndex: number;
    page: number;
    /** Encabezado más profundo que cubre al chunk. `null` cuando el extractor no detectó ninguno. */
    section: string | null;
    /** Miga de pan completa, h1 → h2 → h3. Vacía cuando no hay estructura. */
    sectionPath: ReadonlyArray<string>;
}

/** Cómo se determinó la referencia de una entrada. */
export type ReferenceResolution =
    /** El encabezado propio del chunk nombra la referencia. */
    | 'heading'
    /** La hereda del encabezado anterior — es cuerpo de esa sección. */
    | 'inherited'
    /** No hay referencia deducible. */
    | 'none';

export interface ResolvedOutlineEntry extends DocumentOutlineEntry {
    reference: PassageReference | null;
    resolution: ReferenceResolution;
}

/** Tramo contiguo de chunks, ambos extremos inclusive. */
export interface ChunkRange {
    start: number;
    end: number;
}

/**
 * Un encabezado más largo que esto no es un encabezado: es una línea de
 * cuerpo que el extractor promovió por error. Se ven seguido en PDFs
 * escaneados ("6 [7]. TVJTJ (will be): Waw-relative introduces a").
 * No hace falta que el corte sea fino — el parser rechaza igual casi todo
 * lo que no termine en un número.
 */
const MAX_HEADING_CHARS = 80;

/**
 * Tope de versículo para el extremo abierto de un rango. El capítulo más
 * largo de la Biblia (Salmo 119) tiene 176 versículos; 1.000 deja margen
 * sin necesidad de una tabla de conteo por capítulo.
 */
const OPEN_ENDED_VERSE = 1_000;

/**
 * Le asigna a cada chunk la referencia bíblica que le corresponde.
 *
 * Recorre las entradas en orden de `chunkIndex` llevando dos estados:
 *   - el LIBRO en curso, que sale de la miga de pan (un encabezado
 *     "Jonah" dentro de un comentario a los profetas menores abre el
 *     tramo de Jonás);
 *   - la REFERENCIA en curso, que sale del último encabezado que nombró
 *     una, y se hereda hacia adelante.
 *
 * La herencia es lo que hace útil al módulo: el encabezado "1:1-3"
 * aparece UNA vez y las diez páginas de comentario que le siguen no
 * repiten la referencia en ningún lado. Sin heredar, se seleccionaría el
 * título y nada del contenido.
 *
 * Cambiar de libro corta la herencia: el cuerpo de Miqueas no puede
 * quedar colgando de un encabezado de Jonás.
 */
export function resolveOutlineReferences(
    entries: ReadonlyArray<DocumentOutlineEntry>,
): ResolvedOutlineEntry[] {
    const ordered = [...entries].sort((a, b) => a.chunkIndex - b.chunkIndex);

    let currentBook: BibleBookId | null = null;
    let currentReference: PassageReference | null = null;

    return ordered.map(entry => {
        const bookFromPath = detectBookFromPath(entry.sectionPath);
        if (bookFromPath && bookFromPath !== currentBook) {
            currentBook = bookFromPath;
            currentReference = null;
        }

        const fromHeading = entry.section
            ? parseHeadingReference(entry.section, currentBook)
            : null;

        if (fromHeading) {
            currentBook = fromHeading.bookId;
            currentReference = fromHeading;
            return { ...entry, reference: fromHeading, resolution: 'heading' as const };
        }

        if (currentReference) {
            return { ...entry, reference: currentReference, resolution: 'inherited' as const };
        }

        return { ...entry, reference: null, resolution: 'none' as const };
    });
}

/**
 * Lee un encabezado como referencia bíblica.
 *
 * Dos formas, porque los comentarios usan las dos:
 *   - completa — "Micah 4:8", "Jonah 1:1-3";
 *   - desnuda — "1:1-3", "2.4", que solo significan algo dentro del libro
 *     que las contiene. Ahí se le presta el libro del contexto.
 *
 * Devuelve `null` ante cualquier duda. Un falso positivo acá arrastra
 * decenas de chunks a la sección equivocada por herencia, así que el
 * módulo prefiere no reconocer un encabezado bueno antes que inventar uno.
 */
export function parseHeadingReference(
    heading: string,
    contextBookId: BibleBookId | null,
): PassageReference | null {
    const cleaned = heading.trim();
    if (!cleaned || cleaned.length > MAX_HEADING_CHARS) return null;

    const direct = parsePassageReference(cleaned);
    if (direct.ok) return direct.ref;

    if (!contextBookId) return null;

    // Forma desnuda: el encabezado es SOLO capítulo:versículo. Se exige que
    // la cadena entera sea eso — "1:1-3" sí, "ver 1:1-3" no, porque en el
    // segundo caso el encabezado está hablando de otra cosa.
    if (!/^\d+[:.]\d+(?:[-–—]\d+(?:[:.]\d+)?)?$/.test(cleaned)) return null;

    const book = getBookById(contextBookId);
    if (!book) return null;

    const withBook = parsePassageReference(`${book.nameEn} ${cleaned}`);
    return withBook.ok ? withBook.ref : null;
}

/**
 * Busca en la miga de pan un encabezado que sea el nombre de un libro.
 *
 * Va de lo más profundo a lo más superficial: en
 * `["The Minor Prophets", "Jonah", "1:1-3"]` el libro en curso es Jonás, no
 * el volumen entero. Solo acepta coincidencias de la cadena COMPLETA y sin
 * ambigüedad — "A Commentary on Obadiah, Jonah, Micah" no nombra un libro,
 * nombra tres, y tomar el primero sería adivinar.
 */
function detectBookFromPath(sectionPath: ReadonlyArray<string>): BibleBookId | null {
    for (let i = sectionPath.length - 1; i >= 0; i--) {
        const candidate = sectionPath[i]?.trim();
        if (!candidate || candidate.length > MAX_HEADING_CHARS) continue;
        const matches = findBooksByAlias(candidate);
        if (matches.length === 1) return matches[0]!.id;
    }
    return null;
}

export interface SelectChunksOptions {
    /**
     * Chunks de contexto a cada lado de cada tramo seleccionado. El corte
     * de un chunk cae en mitad de una oración, así que el vecino inmediato
     * suele completar la idea. Por defecto 1.
     */
    contextChunks?: number;
    /**
     * Tope de chunks devueltos. Protege el presupuesto del prompt cuando
     * el pasaje cae en una sección enorme. Por defecto 60.
     */
    maxChunks?: number;
}

export interface ChunkSelection {
    /** Tramos contiguos de `chunkIndex`, en orden y sin solaparse. */
    ranges: ReadonlyArray<ChunkRange>;
    /** Total de chunks que cubren los tramos. */
    chunkCount: number;
    /** `true` cuando el tope recortó la selección. */
    truncated: boolean;
}

/**
 * Se queda con los chunks cuya referencia solapa el pasaje del trabajo.
 *
 * Devuelve TRAMOS, no una bolsa de chunks: el comentario a Jonás 1:1-3 se
 * lee corrido, y entregarlo salteado o desordenado es justo lo que hace
 * inservible al camino semántico para trabajo verso por verso.
 */
export function selectChunksForPassage(
    resolved: ReadonlyArray<ResolvedOutlineEntry>,
    passage: PassageReference,
    options: SelectChunksOptions = {},
): ChunkSelection {
    const contextChunks = Math.max(0, options.contextChunks ?? 1);
    const maxChunks = Math.max(1, options.maxChunks ?? 60);

    const hits = resolved
        .filter(e => e.reference !== null && referencesOverlap(e.reference, passage))
        .map(e => e.chunkIndex);

    if (hits.length === 0) {
        return { ranges: [], chunkCount: 0, truncated: false };
    }

    const lowest = resolved[0]?.chunkIndex ?? 0;
    const highest = resolved[resolved.length - 1]?.chunkIndex ?? 0;

    const padded = new Set<number>();
    for (const index of hits) {
        for (let i = index - contextChunks; i <= index + contextChunks; i++) {
            if (i >= lowest && i <= highest) padded.add(i);
        }
    }

    const sorted = [...padded].sort((a, b) => a - b);
    const capped = sorted.slice(0, maxChunks);

    return {
        ranges: groupContiguous(capped),
        chunkCount: capped.length,
        truncated: capped.length < sorted.length,
    };
}

/** Agrupa índices ordenados en tramos contiguos. */
function groupContiguous(sorted: ReadonlyArray<number>): ChunkRange[] {
    const ranges: ChunkRange[] = [];
    for (const index of sorted) {
        const last = ranges[ranges.length - 1];
        if (last && index === last.end + 1) {
            last.end = index;
        } else {
            ranges.push({ start: index, end: index });
        }
    }
    return ranges;
}

/**
 * ¿Se pisan dos rangos de referencia? Un capítulo sin versículos ("Jonás 1")
 * cubre el capítulo entero, así que solapa con cualquier versículo suyo.
 */
export function referencesOverlap(a: PassageReference, b: PassageReference): boolean {
    if (a.bookId !== b.bookId) return false;
    const aStart = versePosition(a.chapterStart, a.verseStart ?? 1);
    const aEnd = versePosition(a.chapterEnd, a.verseEnd ?? OPEN_ENDED_VERSE);
    const bStart = versePosition(b.chapterStart, b.verseStart ?? 1);
    const bEnd = versePosition(b.chapterEnd, b.verseEnd ?? OPEN_ENDED_VERSE);
    return aStart <= bEnd && bStart <= aEnd;
}

/** Posición ordenable de un versículo dentro de un libro. */
function versePosition(chapter: number, verse: number): number {
    return chapter * (OPEN_ENDED_VERSE + 1) + verse;
}

export interface OutlineStructureQuality {
    /** Chunks cuyo encabezado propio nombró una referencia. */
    headingCount: number;
    /** Chunks con referencia, propia o heredada. */
    referencedCount: number;
    totalCount: number;
    /**
     * `true` cuando vale la pena seleccionar por estructura. Falso para los
     * documentos que se extrajeron sin encabezados: ahí el llamador cae al
     * camino semántico en vez de devolver una selección vacía.
     */
    usable: boolean;
}

/**
 * Mide si el esquema de un documento sirve para seleccionar por referencia.
 *
 * El umbral es deliberadamente bajo — con dos encabezados de referencia ya
 * hay un índice, y el llamador igual verifica que la selección para SU
 * pasaje no venga vacía antes de usarla.
 */
export function outlineStructureQuality(
    resolved: ReadonlyArray<ResolvedOutlineEntry>,
): OutlineStructureQuality {
    const headingCount = resolved.filter(e => e.resolution === 'heading').length;
    const referencedCount = resolved.filter(e => e.reference !== null).length;
    return {
        headingCount,
        referencedCount,
        totalCount: resolved.length,
        usable: headingCount >= 2,
    };
}
