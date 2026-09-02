/**
 * Saneamiento del texto extraído de un PDF, ANTES de que entre al índice.
 *
 * ## Por qué existe
 *
 * Un PDF es un archivo que sube un tercero, y su texto termina en dos lugares
 * peligrosos: dentro del prompt de un modelo (como contexto recuperado) y
 * dentro de una cita que el pastor lee y firma. Entre esos dos destinos hay
 * una familia de caracteres que el ojo no ve y el modelo sí:
 *
 *   - **Caracteres de ancho cero** (`U+200B`, `U+FEFF`, `U+2060`): texto
 *     invisible que puede llevar instrucciones al modelo sin que nadie que
 *     revise el documento lo note.
 *   - **El bloque TAG** (`U+E0000`–`U+E007F`): el canal clásico de inyección
 *     invisible. Codifica ASCII completo en caracteres que ningún visor
 *     dibuja.
 *   - **Overrides bidireccionales** (`U+202A`–`U+202E`, `U+2066`–`U+2069`):
 *     hacen que lo MOSTRADO difiera de lo ALMACENADO. Un revisor humano lee
 *     una cosa y el modelo recibe otra.
 *   - **Controles C0/C1**: ruido de extracción que ninguna tipografía dibuja.
 *
 * Nada de esto es hipotético para este corpus: los PDFs de la biblioteca ya
 * demostraron traer codificaciones rotas (fuentes griegas sin mapa Unicode),
 * así que la capa de texto de un PDF NO es texto confiable.
 *
 * ## Qué NO toca, a propósito
 *
 * - **Marcas combinantes.** Los espíritus y acentos del griego politónico y
 *   el niqqud/cantilación del hebreo (`U+0591`–`U+05C7`) son la carga útil de
 *   este producto. Se conservan intactas: sacarlas sería destruir justo lo que
 *   el tier promete.
 * - **`U+200E`/`U+200F` (LRM/RLM).** Son invisibles, pero no ocultan texto:
 *   sólo empujan la dirección de un tramo neutro. En un corpus con hebreo
 *   ayudan a que la cita se lea bien, y no habilitan el ataque que motiva este
 *   módulo —que es meter texto que el humano no ve y el modelo sí—. Los
 *   overrides sí lo habilitan, y esos se van.
 * - **Los marcadores de página** `<!-- page: N -->` y la estructura Markdown.
 *   Son el contrato con el chunker; tocarlos rompería la cita verificable.
 *
 * ## Esta es la copia de `functions`
 *
 * El original vive en `packages/domain/src/library/sanitizeExtractedText.ts`.
 * `packages/functions` no depende de `@dosfilos/domain` a propósito (corre en
 * otro runtime), así que el módulo está duplicado y `sanitizeParity.test.ts`
 * compara las dos tablas LEYENDO el fuente del dominio. Si tocás
 * `SANITIZER_RANGES` acá, tocá el original — el test lo exige.
 */

/** Categoría de carácter removido. Se reporta por separado para poder auditar. */
export type SanitizedCategory =
    | 'control'
    | 'zeroWidth'
    | 'softHyphen'
    | 'bidi'
    | 'tag'
    | 'privateUse';

/**
 * Tabla única de rangos removidos: `[inicio, fin, categoría]`, ambos extremos
 * inclusive, en code points.
 *
 * ⚠️ Espejada en `packages/functions/src/library/sanitizeExtractedText.ts`.
 * El test de paridad compara las dos tablas leyendo el fuente.
 */
export const SANITIZER_RANGES: ReadonlyArray<readonly [number, number, SanitizedCategory]> = [
    // C0: todo menos \t (0x09) y \n (0x0A). \r se normaliza antes, no se remueve acá.
    [0x0000, 0x0008, 'control'],
    [0x000b, 0x000c, 'control'],
    [0x000e, 0x001f, 'control'],
    [0x007f, 0x009f, 'control'],   // DEL + C1
    [0x00ad, 0x00ad, 'softHyphen'], // guion suave: en PDFs parte palabras a mitad
    [0x180e, 0x180e, 'zeroWidth'],  // MONGOLIAN VOWEL SEPARATOR
    [0x200b, 0x200d, 'zeroWidth'],  // ZWSP, ZWNJ, ZWJ
    [0x202a, 0x202e, 'bidi'],       // LRE, RLE, PDF, LRO, RLO
    [0x2060, 0x2064, 'zeroWidth'],  // WORD JOINER + invisibles matemáticos
    [0x2066, 0x2069, 'bidi'],       // LRI, RLI, FSI, PDI
    [0xe000, 0xf8ff, 'privateUse'], // Uso privado: glifos sin significado Unicode
    [0xfeff, 0xfeff, 'zeroWidth'],  // BOM / ZWNBSP
    [0xfff9, 0xfffb, 'control'],    // anotación interlineal
    [0xe0000, 0xe007f, 'tag'],      // bloque TAG: canal de inyección invisible
];

export interface SanitizationReport {
    /** Total de code points removidos. */
    removed: number;
    /** Desglose por categoría. Sólo aparecen las categorías con al menos uno. */
    byCategory: Partial<Record<SanitizedCategory, number>>;
    /** `true` si se normalizó algún fin de línea CRLF/CR. */
    normalizedLineEndings: boolean;
}

export interface SanitizedText {
    text: string;
    report: SanitizationReport;
}

function categoryOf(codePoint: number): SanitizedCategory | null {
    for (const [start, end, category] of SANITIZER_RANGES) {
        if (codePoint >= start && codePoint <= end) return category;
    }
    return null;
}

/**
 * Sanea el texto extraído. Idempotente: aplicarlo dos veces da lo mismo que
 * una.
 *
 * Recorre por code point (no por unidad UTF-16) para que el bloque TAG, que
 * vive fuera del BMP, se detecte entero en vez de por mitades de par
 * suplente.
 */
export function sanitizeExtractedText(input: string): SanitizedText {
    if (!input) {
        return { text: input ?? '', report: { removed: 0, byCategory: {}, normalizedLineEndings: false } };
    }

    // Fines de línea primero: CRLF y CR sueltos pasan a \n. Se hace antes del
    // barrido para que el \r no se cuente como control removido — es una
    // normalización, no una remoción, y contarla como tal inflaría el reporte
    // en cualquier documento de origen Windows.
    const normalized = input.replace(/\r\n?/g, '\n');
    const normalizedLineEndings = normalized !== input;

    const byCategory: Partial<Record<SanitizedCategory, number>> = {};
    let removed = 0;
    let out = '';

    for (const char of normalized) {
        const codePoint = char.codePointAt(0)!;
        const category = categoryOf(codePoint);
        if (category) {
            byCategory[category] = (byCategory[category] ?? 0) + 1;
            removed++;
            continue;
        }
        out += char;
    }

    return { text: out, report: { removed, byCategory, normalizedLineEndings } };
}

/** Azúcar para los llamadores que no necesitan el reporte. */
export function sanitizeExtractedTextOnly(input: string): string {
    return sanitizeExtractedText(input).text;
}

/** Resumen de una línea para logs, o `null` si no había nada que sanear. */
export function describeSanitization(report: SanitizationReport): string | null {
    if (report.removed === 0) return null;
    const detail = Object.entries(report.byCategory)
        .sort((a, b) => b[1] - a[1])
        .map(([category, count]) => `${category}=${count}`)
        .join(' ');
    return `${report.removed} caracteres invisibles removidos (${detail})`;
}
