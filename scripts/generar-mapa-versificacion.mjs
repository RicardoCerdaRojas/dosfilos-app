/**
 * Genera `packages/domain/src/bible/versification/versificationMap.ts` a
 * partir de la versificación oficial de las Sociedades Bíblicas Unidas.
 *
 * Por qué generarlo y no escribirlo a mano: son 27 de los 39 libros del AT
 * los que difieren entre el Texto Masorético y las versiones castellanas, y
 * solo los Salmos aportan 61 capítulos. Transcribir esa tabla de memoria —o
 * derivarla de conteos de versículos— es exactamente el tipo de error que
 * manda a un pastor a predicar el versículo equivocado: los conteos dicen
 * DÓNDE difieren, no CÓMO alinean. En Jonás el versículo de más está al
 * final del capítulo 1; en el Salmo 3 está al principio, y es el título.
 *
 * Fuente: https://github.com/ubsicap/versification_json (MIT, © 2019
 * United Bible Societies Institute for Computer Assisted Publishing).
 * El archivo `eng.vrs` describe la versificación de las versiones
 * inglesas/castellanas modernas RELATIVA a `org`, la del texto original.
 *
 * Correr: node scripts/generar-mapa-versificacion.mjs
 * Es idempotente. El test `versificationMap.test.ts` valida las invariantes
 * del resultado, así que una regeneración que rompa algo se nota.
 */
import fs from 'fs';
import path from 'path';

const FUENTE = 'https://raw.githubusercontent.com/ubsicap/versification_json/master/examples/eng.json';
const DESTINO = 'packages/domain/src/bible/versification/versificationMap.ts';

/** Los 66 del canon protestante. Se descartan los deuterocanónicos del mapeo. */
const CANON = new Set([
    'GEN', 'EXO', 'LEV', 'NUM', 'DEU', 'JOS', 'JDG', 'RUT',
    '1SA', '2SA', '1KI', '2KI', '1CH', '2CH', 'EZR', 'NEH', 'EST',
    'JOB', 'PSA', 'PRO', 'ECC', 'SNG', 'ISA', 'JER', 'LAM', 'EZK', 'DAN',
    'HOS', 'JOL', 'AMO', 'OBA', 'JON', 'MIC', 'NAM', 'HAB', 'ZEP', 'HAG', 'ZEC', 'MAL',
    'MAT', 'MRK', 'LUK', 'JHN', 'ACT', 'ROM', '1CO', '2CO', 'GAL', 'EPH', 'PHP', 'COL',
    '1TH', '2TH', '1TI', '2TI', 'TIT', 'PHM', 'HEB', 'JAS', '1PE', '2PE',
    '1JN', '2JN', '3JN', 'JUD', 'REV',
]);

/** "JON 2:1-10" → { book, chapter, from, to }. "JON 1:17" → from === to. */
function parseRef(ref) {
    const [book, coords] = ref.split(' ');
    const [chapterRaw, versesRaw] = coords.split(':');
    const [fromRaw, toRaw] = versesRaw.split('-');
    return {
        book,
        chapter: Number(chapterRaw),
        from: Number(fromRaw),
        to: Number(toRaw ?? fromRaw),
    };
}

const res = await fetch(FUENTE);
if (!res.ok) throw new Error(`No se pudo bajar la versificación: HTTP ${res.status}`);
const eng = await res.json();

const entradas = [];
for (const [readerRef, originalRef] of Object.entries(eng.mappedVerses)) {
    const lector = parseRef(readerRef);
    const original = parseRef(originalRef);
    if (!CANON.has(lector.book)) continue;
    // Invariante de la fuente: los dos lados abarcan la misma cantidad de
    // versículos. Si dejara de cumplirse, el mapeo posicional que hace
    // `mapVersification` sería inválido y hay que enterarse acá, no en
    // producción.
    const largoLector = lector.to - lector.from + 1;
    const largoOriginal = original.to - original.from + 1;
    if (largoLector !== largoOriginal) {
        throw new Error(
            `Rango de largo distinto en la fuente: "${readerRef}" (${largoLector}) → "${originalRef}" (${largoOriginal})`,
        );
    }
    entradas.push({ ...lector, oChapter: original.chapter, oFrom: original.from, oTo: original.to });
}

entradas.sort((a, b) =>
    a.book.localeCompare(b.book) || a.chapter - b.chapter || a.from - b.from);

const libros = [...new Set(entradas.map(e => e.book))];
const filas = entradas
    .map(e => `    { book: '${e.book}', chapter: ${e.chapter}, from: ${e.from}, to: ${e.to}, originalChapter: ${e.oChapter}, originalFrom: ${e.oFrom}, originalTo: ${e.oTo} },`)
    .join('\n');

const contenido = `import type { BibleBookId } from '../canon/BibleCanon';

/**
 * ARCHIVO GENERADO — no editar a mano.
 * Regenerar con: node scripts/generar-mapa-versificacion.mjs
 *
 * Correspondencia entre la versificación que lee el pastor (la de las
 * versiones castellanas modernas, RVR incluida) y la del texto original
 * (Texto Masorético para el AT).
 *
 * Fuente: versificación oficial de las Sociedades Bíblicas Unidas
 * (https://github.com/ubsicap/versification_json, MIT, © 2019 United Bible
 * Societies Institute for Computer Assisted Publishing), archivo \`eng\`,
 * que describe las versiones modernas relativas a \`org\`.
 *
 * ${entradas.length} tramos en ${libros.length} libros. Todo lo que no
 * aparece acá corresponde uno a uno: mismo capítulo, mismo versículo.
 *
 * El \`from: 0\` de los Salmos NO es un error: es el título del salmo
 * («Salmo de David…»), que el Masorético cuenta como versículo 1 y las
 * versiones castellanas imprimen sin numerar. Representarlo como el
 * versículo 0 del lector es lo que deja expresar la correspondencia sin
 * mentir en ninguno de los dos lados.
 */
export interface VersificationSpan {
    book: BibleBookId;
    /** Capítulo en la versificación del lector. */
    chapter: number;
    /** Primer versículo del tramo, del lado del lector. \`0\` = título del salmo. */
    from: number;
    /** Último versículo del tramo, del lado del lector. */
    to: number;
    /** Capítulo correspondiente en el texto original. */
    originalChapter: number;
    originalFrom: number;
    originalTo: number;
}

export const VERSIFICATION_SPANS: ReadonlyArray<VersificationSpan> = [
${filas}
];

/** Libros donde las dos versificaciones difieren en algún punto. */
export const BOOKS_WITH_VERSIFICATION_DIFFERENCES: ReadonlyArray<BibleBookId> = [
${libros.map(b => `    '${b}',`).join('\n')}
];
`;

fs.mkdirSync(path.dirname(DESTINO), { recursive: true });
fs.writeFileSync(DESTINO, contenido);
console.log(`${entradas.length} tramos en ${libros.length} libros → ${DESTINO}`);
console.log('libros:', libros.join(', '));
