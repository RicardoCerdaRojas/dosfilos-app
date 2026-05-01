/**
 * Canonical Bible structure — Protestant 66-book canon.
 *
 * Single source of truth for passage validation in the Exegesis module.
 * Decoupled from any specific Bible version (RVR1960, ASV, NA28, …) and
 * from the Hebrew-tutor catalog (which is morphhb-keyed and only covers
 * the Tanakh): exegesis works across both Testaments and must not be
 * tied to the morphhb identifier scheme.
 *
 * Why duplicate? The Hebrew-tutor catalog has 38 OT books keyed by morphhb
 * filename; we need 66 books with rich aliases for free-text parsing, and
 * a stable 3-letter ID scheme that's industry-standard (matches Logos,
 * Accordance, etc.). Coupling the two would force exegesis to depend on
 * an infrastructure module and on the OT-only assumption.
 *
 * Verses-per-chapter is intentionally NOT stored here in v1 — chapter
 * range validation is enough for the parser to be useful, and embedding
 * ~1200 numbers adds maintenance cost. v1.5 can extend `BibleCanonBook`
 * with `versesPerChapter: number[]` if verse-level validation is needed.
 */

export type Testament = 'OT' | 'NT';

/**
 * 3-letter book ID, uppercase. Industry-standard (Logos/Accordance scheme).
 *  - OT: GEN, EXO, LEV, …, MAL (39 books)
 *  - NT: MAT, MRK, LUK, …, REV (27 books)
 *  - Numbered books: 1SA, 2SA, 1KI, …, 1CO, 2CO, …
 */
export type BibleBookId =
    // ── OT ──────────────────────────────────────────────────────────────
    | 'GEN' | 'EXO' | 'LEV' | 'NUM' | 'DEU'
    | 'JOS' | 'JDG' | 'RUT'
    | '1SA' | '2SA' | '1KI' | '2KI' | '1CH' | '2CH'
    | 'EZR' | 'NEH' | 'EST'
    | 'JOB' | 'PSA' | 'PRO' | 'ECC' | 'SNG'
    | 'ISA' | 'JER' | 'LAM' | 'EZK' | 'DAN'
    | 'HOS' | 'JOL' | 'AMO' | 'OBA' | 'JON' | 'MIC'
    | 'NAM' | 'HAB' | 'ZEP' | 'HAG' | 'ZEC' | 'MAL'
    // ── NT ──────────────────────────────────────────────────────────────
    | 'MAT' | 'MRK' | 'LUK' | 'JHN' | 'ACT'
    | 'ROM' | '1CO' | '2CO' | 'GAL' | 'EPH' | 'PHP' | 'COL'
    | '1TH' | '2TH' | '1TI' | '2TI' | 'TIT' | 'PHM'
    | 'HEB' | 'JAS' | '1PE' | '2PE'
    | '1JN' | '2JN' | '3JN' | 'JUD' | 'REV';

export interface BibleCanonBook {
    /** 3-letter uppercase ID — primary key. */
    id: BibleBookId;
    /** Canonical position 1..66 (Genesis=1, Revelation=66). */
    canonicalOrder: number;
    /** Old or New Testament. */
    testament: Testament;
    /** Total chapters in the book. */
    chapterCount: number;
    /** Spanish primary name (display form, with accents). */
    nameEs: string;
    /** English primary name (display form). */
    nameEn: string;
    /**
     * All recognized aliases for free-text parsing — lowercase, no accents,
     * no trailing dots. The parser normalizes user input the same way before
     * matching against this list. ALWAYS includes the lowercased + de-accented
     * forms of `nameEs` and `nameEn`, plus common abbreviations in both
     * languages. Numbered books include both space and non-space variants
     * ("1 cor", "1cor", "i cor", "icor") so the parser is forgiving.
     */
    aliases: string[];
}

/**
 * The 66-book canon. Order is canonical (Gen=1 ... Rev=66).
 *
 * Aliases coverage philosophy: be generous. Users type fast, mix languages,
 * forget accents, and use abbreviations from various conventions (RAE
 * abbreviations in Spanish, SBL/CMS in English, classical abbreviations like
 * "Mt." or "Mat."). Adding an extra alias costs nothing; failing to parse
 * a reference frustrates the user.
 */
export const BIBLE_CANON: ReadonlyArray<BibleCanonBook> = [
    // ── Pentateuco / Pentateuch ─────────────────────────────────────────
    { id: 'GEN', canonicalOrder: 1, testament: 'OT', chapterCount: 50,
      nameEs: 'Génesis', nameEn: 'Genesis',
      aliases: ['genesis', 'gen', 'gn', 'ge'] },
    { id: 'EXO', canonicalOrder: 2, testament: 'OT', chapterCount: 40,
      nameEs: 'Éxodo', nameEn: 'Exodus',
      aliases: ['exodo', 'exodus', 'exo', 'ex'] },
    { id: 'LEV', canonicalOrder: 3, testament: 'OT', chapterCount: 27,
      nameEs: 'Levítico', nameEn: 'Leviticus',
      aliases: ['levitico', 'leviticus', 'lev', 'lv'] },
    { id: 'NUM', canonicalOrder: 4, testament: 'OT', chapterCount: 36,
      nameEs: 'Números', nameEn: 'Numbers',
      aliases: ['numeros', 'numbers', 'num', 'nu', 'nm'] },
    { id: 'DEU', canonicalOrder: 5, testament: 'OT', chapterCount: 34,
      nameEs: 'Deuteronomio', nameEn: 'Deuteronomy',
      aliases: ['deuteronomio', 'deuteronomy', 'deut', 'deu', 'dt', 'dn'] },

    // ── Históricos / Historical ─────────────────────────────────────────
    { id: 'JOS', canonicalOrder: 6, testament: 'OT', chapterCount: 24,
      nameEs: 'Josué', nameEn: 'Joshua',
      aliases: ['josue', 'joshua', 'jos', 'jos.', 'jue'] /* care: 'jue' is also Judges abbr in some traditions, but we map 'jue' → JDG below; 'jos' → JOS */ },
    { id: 'JDG', canonicalOrder: 7, testament: 'OT', chapterCount: 21,
      nameEs: 'Jueces', nameEn: 'Judges',
      aliases: ['jueces', 'judges', 'jue', 'jdg', 'jdc', 'jud'] /* 'jud' collides with Jude (JUD) — disambiguated by chapter range at validate time */ },
    { id: 'RUT', canonicalOrder: 8, testament: 'OT', chapterCount: 4,
      nameEs: 'Rut', nameEn: 'Ruth',
      aliases: ['rut', 'ruth', 'rt', 'ru'] },
    { id: '1SA', canonicalOrder: 9, testament: 'OT', chapterCount: 31,
      nameEs: '1 Samuel', nameEn: '1 Samuel',
      aliases: ['1samuel', '1 samuel', '1sa', '1 sa', '1sam', '1 sam', 'i samuel', 'i sa', 'i sam', '1s', '1 s'] },
    { id: '2SA', canonicalOrder: 10, testament: 'OT', chapterCount: 24,
      nameEs: '2 Samuel', nameEn: '2 Samuel',
      aliases: ['2samuel', '2 samuel', '2sa', '2 sa', '2sam', '2 sam', 'ii samuel', 'ii sa', 'ii sam', '2s', '2 s'] },
    { id: '1KI', canonicalOrder: 11, testament: 'OT', chapterCount: 22,
      nameEs: '1 Reyes', nameEn: '1 Kings',
      aliases: ['1reyes', '1 reyes', '1re', '1 re', '1r', '1 r', '1kings', '1 kings', '1ki', '1 ki', '1kgs', '1 kgs', 'i reyes', 'i kings'] },
    { id: '2KI', canonicalOrder: 12, testament: 'OT', chapterCount: 25,
      nameEs: '2 Reyes', nameEn: '2 Kings',
      aliases: ['2reyes', '2 reyes', '2re', '2 re', '2r', '2 r', '2kings', '2 kings', '2ki', '2 ki', '2kgs', '2 kgs', 'ii reyes', 'ii kings'] },
    { id: '1CH', canonicalOrder: 13, testament: 'OT', chapterCount: 29,
      nameEs: '1 Crónicas', nameEn: '1 Chronicles',
      aliases: ['1cronicas', '1 cronicas', '1cr', '1 cr', '1cro', '1 cro', '1ch', '1 ch', '1chr', '1 chr', '1chron', '1 chron', 'i cronicas', 'i chronicles'] },
    { id: '2CH', canonicalOrder: 14, testament: 'OT', chapterCount: 36,
      nameEs: '2 Crónicas', nameEn: '2 Chronicles',
      aliases: ['2cronicas', '2 cronicas', '2cr', '2 cr', '2cro', '2 cro', '2ch', '2 ch', '2chr', '2 chr', '2chron', '2 chron', 'ii cronicas', 'ii chronicles'] },
    { id: 'EZR', canonicalOrder: 15, testament: 'OT', chapterCount: 10,
      nameEs: 'Esdras', nameEn: 'Ezra',
      aliases: ['esdras', 'ezra', 'esd', 'esr', 'ezr'] },
    { id: 'NEH', canonicalOrder: 16, testament: 'OT', chapterCount: 13,
      nameEs: 'Nehemías', nameEn: 'Nehemiah',
      aliases: ['nehemias', 'nehemiah', 'neh', 'ne'] },
    { id: 'EST', canonicalOrder: 17, testament: 'OT', chapterCount: 10,
      nameEs: 'Ester', nameEn: 'Esther',
      aliases: ['ester', 'esther', 'est', 'es'] },

    // ── Poéticos / Poetic ───────────────────────────────────────────────
    { id: 'JOB', canonicalOrder: 18, testament: 'OT', chapterCount: 42,
      nameEs: 'Job', nameEn: 'Job',
      aliases: ['job', 'jb'] },
    { id: 'PSA', canonicalOrder: 19, testament: 'OT', chapterCount: 150,
      nameEs: 'Salmos', nameEn: 'Psalms',
      aliases: ['salmos', 'salmo', 'psalms', 'psalm', 'sal', 'sl', 'sa', 'ps', 'psa'] },
    { id: 'PRO', canonicalOrder: 20, testament: 'OT', chapterCount: 31,
      nameEs: 'Proverbios', nameEn: 'Proverbs',
      aliases: ['proverbios', 'proverbs', 'pr', 'pro', 'prov', 'prv'] },
    { id: 'ECC', canonicalOrder: 21, testament: 'OT', chapterCount: 12,
      nameEs: 'Eclesiastés', nameEn: 'Ecclesiastes',
      aliases: ['eclesiastes', 'ecclesiastes', 'ec', 'ecl', 'ecc', 'qoh', 'qohelet'] },
    { id: 'SNG', canonicalOrder: 22, testament: 'OT', chapterCount: 8,
      nameEs: 'Cantares', nameEn: 'Song of Solomon',
      aliases: ['cantares', 'cantar de los cantares', 'cant', 'ct', 'song of solomon', 'song of songs', 'song', 'sos', 'sng', 'cnt'] },

    // ── Profetas mayores / Major Prophets ───────────────────────────────
    { id: 'ISA', canonicalOrder: 23, testament: 'OT', chapterCount: 66,
      nameEs: 'Isaías', nameEn: 'Isaiah',
      aliases: ['isaias', 'isaiah', 'isa', 'is'] },
    { id: 'JER', canonicalOrder: 24, testament: 'OT', chapterCount: 52,
      nameEs: 'Jeremías', nameEn: 'Jeremiah',
      aliases: ['jeremias', 'jeremiah', 'jer', 'jr'] },
    { id: 'LAM', canonicalOrder: 25, testament: 'OT', chapterCount: 5,
      nameEs: 'Lamentaciones', nameEn: 'Lamentations',
      aliases: ['lamentaciones', 'lamentations', 'lam', 'lm'] },
    { id: 'EZK', canonicalOrder: 26, testament: 'OT', chapterCount: 48,
      nameEs: 'Ezequiel', nameEn: 'Ezekiel',
      aliases: ['ezequiel', 'ezekiel', 'ez', 'eze', 'ezk', 'ezeq'] },
    { id: 'DAN', canonicalOrder: 27, testament: 'OT', chapterCount: 12,
      nameEs: 'Daniel', nameEn: 'Daniel',
      aliases: ['daniel', 'dan', 'dn', 'da'] },

    // ── Profetas menores / Minor Prophets ───────────────────────────────
    { id: 'HOS', canonicalOrder: 28, testament: 'OT', chapterCount: 14,
      nameEs: 'Oseas', nameEn: 'Hosea',
      aliases: ['oseas', 'hosea', 'os', 'hos', 'ho'] },
    { id: 'JOL', canonicalOrder: 29, testament: 'OT', chapterCount: 3,
      nameEs: 'Joel', nameEn: 'Joel',
      aliases: ['joel', 'jl', 'jol', 'joe'] },
    { id: 'AMO', canonicalOrder: 30, testament: 'OT', chapterCount: 9,
      nameEs: 'Amós', nameEn: 'Amos',
      aliases: ['amos', 'am', 'amo'] },
    { id: 'OBA', canonicalOrder: 31, testament: 'OT', chapterCount: 1,
      nameEs: 'Abdías', nameEn: 'Obadiah',
      aliases: ['abdias', 'obadiah', 'abd', 'ab', 'oba', 'ob'] },
    { id: 'JON', canonicalOrder: 32, testament: 'OT', chapterCount: 4,
      nameEs: 'Jonás', nameEn: 'Jonah',
      aliases: ['jonas', 'jonah', 'jon', 'jn'] /* 'jn' also matches John (JHN) — disambiguated by chapter range: Jonah has 4 chapters, John has 21 */ },
    { id: 'MIC', canonicalOrder: 33, testament: 'OT', chapterCount: 7,
      nameEs: 'Miqueas', nameEn: 'Micah',
      aliases: ['miqueas', 'micah', 'miq', 'mi', 'mic'] },
    { id: 'NAM', canonicalOrder: 34, testament: 'OT', chapterCount: 3,
      nameEs: 'Nahúm', nameEn: 'Nahum',
      aliases: ['nahum', 'nah', 'na', 'nam'] },
    { id: 'HAB', canonicalOrder: 35, testament: 'OT', chapterCount: 3,
      nameEs: 'Habacuc', nameEn: 'Habakkuk',
      aliases: ['habacuc', 'habakkuk', 'hab', 'hb'] },
    { id: 'ZEP', canonicalOrder: 36, testament: 'OT', chapterCount: 3,
      nameEs: 'Sofonías', nameEn: 'Zephaniah',
      aliases: ['sofonias', 'zephaniah', 'sof', 'so', 'zep', 'zeph'] },
    { id: 'HAG', canonicalOrder: 37, testament: 'OT', chapterCount: 2,
      nameEs: 'Hageo', nameEn: 'Haggai',
      aliases: ['hageo', 'haggai', 'hag', 'hg'] },
    { id: 'ZEC', canonicalOrder: 38, testament: 'OT', chapterCount: 14,
      nameEs: 'Zacarías', nameEn: 'Zechariah',
      aliases: ['zacarias', 'zechariah', 'zac', 'za', 'zec', 'zech'] },
    { id: 'MAL', canonicalOrder: 39, testament: 'OT', chapterCount: 4,
      nameEs: 'Malaquías', nameEn: 'Malachi',
      aliases: ['malaquias', 'malachi', 'mal', 'ml'] },

    // ── Evangelios / Gospels ────────────────────────────────────────────
    { id: 'MAT', canonicalOrder: 40, testament: 'NT', chapterCount: 28,
      nameEs: 'Mateo', nameEn: 'Matthew',
      aliases: ['mateo', 'matthew', 'mat', 'mt'] },
    { id: 'MRK', canonicalOrder: 41, testament: 'NT', chapterCount: 16,
      nameEs: 'Marcos', nameEn: 'Mark',
      aliases: ['marcos', 'mark', 'mar', 'mc', 'mk', 'mrk'] },
    { id: 'LUK', canonicalOrder: 42, testament: 'NT', chapterCount: 24,
      nameEs: 'Lucas', nameEn: 'Luke',
      aliases: ['lucas', 'luke', 'luc', 'lc', 'lk', 'luk'] },
    { id: 'JHN', canonicalOrder: 43, testament: 'NT', chapterCount: 21,
      nameEs: 'Juan', nameEn: 'John',
      aliases: ['juan', 'john', 'jn', 'jhn', 'jua', 'jo'] /* 'jn' also matches Jonah; disambiguate by chapter count */ },
    { id: 'ACT', canonicalOrder: 44, testament: 'NT', chapterCount: 28,
      nameEs: 'Hechos', nameEn: 'Acts',
      aliases: ['hechos', 'acts', 'hch', 'hec', 'hc', 'ac', 'act'] },

    // ── Cartas paulinas / Pauline Epistles ──────────────────────────────
    { id: 'ROM', canonicalOrder: 45, testament: 'NT', chapterCount: 16,
      nameEs: 'Romanos', nameEn: 'Romans',
      aliases: ['romanos', 'romans', 'rom', 'ro', 'rm'] },
    { id: '1CO', canonicalOrder: 46, testament: 'NT', chapterCount: 16,
      nameEs: '1 Corintios', nameEn: '1 Corinthians',
      aliases: ['1corintios', '1 corintios', '1co', '1 co', '1cor', '1 cor', '1corinthians', '1 corinthians', 'i corintios', 'i corinthians', '1c', '1 c'] },
    { id: '2CO', canonicalOrder: 47, testament: 'NT', chapterCount: 13,
      nameEs: '2 Corintios', nameEn: '2 Corinthians',
      aliases: ['2corintios', '2 corintios', '2co', '2 co', '2cor', '2 cor', '2corinthians', '2 corinthians', 'ii corintios', 'ii corinthians', '2c', '2 c'] },
    { id: 'GAL', canonicalOrder: 48, testament: 'NT', chapterCount: 6,
      nameEs: 'Gálatas', nameEn: 'Galatians',
      aliases: ['galatas', 'galatians', 'gal', 'ga', 'gl'] },
    { id: 'EPH', canonicalOrder: 49, testament: 'NT', chapterCount: 6,
      nameEs: 'Efesios', nameEn: 'Ephesians',
      aliases: ['efesios', 'ephesians', 'efe', 'ef', 'eph', 'ep'] },
    { id: 'PHP', canonicalOrder: 50, testament: 'NT', chapterCount: 4,
      nameEs: 'Filipenses', nameEn: 'Philippians',
      aliases: ['filipenses', 'philippians', 'fil', 'fl', 'php', 'phil'] },
    { id: 'COL', canonicalOrder: 51, testament: 'NT', chapterCount: 4,
      nameEs: 'Colosenses', nameEn: 'Colossians',
      aliases: ['colosenses', 'colossians', 'col', 'co'] },
    { id: '1TH', canonicalOrder: 52, testament: 'NT', chapterCount: 5,
      nameEs: '1 Tesalonicenses', nameEn: '1 Thessalonians',
      aliases: ['1tesalonicenses', '1 tesalonicenses', '1ts', '1 ts', '1tes', '1 tes', '1thess', '1 thess', '1th', '1 th', 'i tesalonicenses', 'i thessalonians'] },
    { id: '2TH', canonicalOrder: 53, testament: 'NT', chapterCount: 3,
      nameEs: '2 Tesalonicenses', nameEn: '2 Thessalonians',
      aliases: ['2tesalonicenses', '2 tesalonicenses', '2ts', '2 ts', '2tes', '2 tes', '2thess', '2 thess', '2th', '2 th', 'ii tesalonicenses', 'ii thessalonians'] },
    { id: '1TI', canonicalOrder: 54, testament: 'NT', chapterCount: 6,
      nameEs: '1 Timoteo', nameEn: '1 Timothy',
      aliases: ['1timoteo', '1 timoteo', '1ti', '1 ti', '1tim', '1 tim', '1timothy', '1 timothy', 'i timoteo', 'i timothy'] },
    { id: '2TI', canonicalOrder: 55, testament: 'NT', chapterCount: 4,
      nameEs: '2 Timoteo', nameEn: '2 Timothy',
      aliases: ['2timoteo', '2 timoteo', '2ti', '2 ti', '2tim', '2 tim', '2timothy', '2 timothy', 'ii timoteo', 'ii timothy'] },
    { id: 'TIT', canonicalOrder: 56, testament: 'NT', chapterCount: 3,
      nameEs: 'Tito', nameEn: 'Titus',
      aliases: ['tito', 'titus', 'tit', 'ti'] /* 'ti' also matches 1Ti/2Ti without numeric prefix; disambiguator is the leading digit */ },
    { id: 'PHM', canonicalOrder: 57, testament: 'NT', chapterCount: 1,
      nameEs: 'Filemón', nameEn: 'Philemon',
      aliases: ['filemon', 'philemon', 'flm', 'fm', 'phm', 'phlm'] },

    // ── Carta a Hebreos + Universales / Hebrews + General ───────────────
    { id: 'HEB', canonicalOrder: 58, testament: 'NT', chapterCount: 13,
      nameEs: 'Hebreos', nameEn: 'Hebrews',
      aliases: ['hebreos', 'hebrews', 'heb', 'he', 'hb'] },
    { id: 'JAS', canonicalOrder: 59, testament: 'NT', chapterCount: 5,
      nameEs: 'Santiago', nameEn: 'James',
      aliases: ['santiago', 'james', 'sant', 'stg', 'jas', 'jam', 'sg'] },
    { id: '1PE', canonicalOrder: 60, testament: 'NT', chapterCount: 5,
      nameEs: '1 Pedro', nameEn: '1 Peter',
      aliases: ['1pedro', '1 pedro', '1pe', '1 pe', '1pet', '1 pet', '1peter', '1 peter', '1p', '1 p', 'i pedro', 'i peter'] },
    { id: '2PE', canonicalOrder: 61, testament: 'NT', chapterCount: 3,
      nameEs: '2 Pedro', nameEn: '2 Peter',
      aliases: ['2pedro', '2 pedro', '2pe', '2 pe', '2pet', '2 pet', '2peter', '2 peter', '2p', '2 p', 'ii pedro', 'ii peter'] },
    { id: '1JN', canonicalOrder: 62, testament: 'NT', chapterCount: 5,
      nameEs: '1 Juan', nameEn: '1 John',
      aliases: ['1juan', '1 juan', '1jn', '1 jn', '1jhn', '1 jhn', '1jua', '1 jua', '1john', '1 john', 'i juan', 'i john'] },
    { id: '2JN', canonicalOrder: 63, testament: 'NT', chapterCount: 1,
      nameEs: '2 Juan', nameEn: '2 John',
      aliases: ['2juan', '2 juan', '2jn', '2 jn', '2jhn', '2 jhn', '2jua', '2 jua', '2john', '2 john', 'ii juan', 'ii john'] },
    { id: '3JN', canonicalOrder: 64, testament: 'NT', chapterCount: 1,
      nameEs: '3 Juan', nameEn: '3 John',
      aliases: ['3juan', '3 juan', '3jn', '3 jn', '3jhn', '3 jhn', '3jua', '3 jua', '3john', '3 john', 'iii juan', 'iii john'] },
    { id: 'JUD', canonicalOrder: 65, testament: 'NT', chapterCount: 1,
      nameEs: 'Judas', nameEn: 'Jude',
      aliases: ['judas', 'jude', 'jud', 'jd', 'jds'] },
    { id: 'REV', canonicalOrder: 66, testament: 'NT', chapterCount: 22,
      nameEs: 'Apocalipsis', nameEn: 'Revelation',
      aliases: ['apocalipsis', 'revelation', 'apoc', 'apo', 'ap', 'rev', 're'] },
];

// ── Lookup index ────────────────────────────────────────────────────────
//
// Built lazily on first access and cached. Map alias → canonical book.
// Aliases are normalized (lowercase, no diacritics, no trailing dots) and
// MUST be unique across the whole canon. If two books share an alias here,
// disambiguation falls to the parser (which uses chapter range as a tie-
// breaker — e.g. 'jn' matches both Jonah/4 chapters and John/21 chapters).
//
// We do NOT throw on alias collision at index-build time because some
// collisions (like 'jn' ⇒ Jonah/John, 'jud' ⇒ Jueces/Judas) are intentional
// and resolved downstream.

const aliasIndex: Map<string, BibleBookId[]> = new Map();
const idIndex: Map<BibleBookId, BibleCanonBook> = new Map();

function buildIndexes(): void {
    if (idIndex.size > 0) return;
    for (const book of BIBLE_CANON) {
        idIndex.set(book.id, book);
        // Also index the primary names (lowercased, de-accented).
        const namesAsAliases = [
            normalizeAlias(book.nameEs),
            normalizeAlias(book.nameEn),
            book.id.toLowerCase(),
            ...book.aliases.map(normalizeAlias),
        ];
        for (const alias of namesAsAliases) {
            const existing = aliasIndex.get(alias) ?? [];
            if (!existing.includes(book.id)) {
                existing.push(book.id);
                aliasIndex.set(alias, existing);
            }
        }
    }
}

/**
 * Normalizes an alias for matching: lowercase, strip diacritics, collapse
 * whitespace, drop trailing dots. Mirrors what `parsePassageReference`
 * does to user input before lookup.
 */
export function normalizeAlias(input: string): string {
    return input
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '') // strip combining diacritical marks
        .replace(/\./g, '')              // drop dots ("Mat." → "mat")
        .replace(/\s+/g, ' ')            // collapse whitespace
        .trim();
}

/** Returns the book by canonical ID, or null if unknown. */
export function getBookById(id: BibleBookId): BibleCanonBook | null {
    buildIndexes();
    return idIndex.get(id) ?? null;
}

/**
 * Returns all books that match the given alias (after normalization).
 * Most aliases resolve to a single book; ambiguous ones (e.g. 'jn' ⇒
 * [JON, JHN]) return multiple — the caller disambiguates using context
 * such as chapter number.
 */
export function findBooksByAlias(alias: string): BibleCanonBook[] {
    buildIndexes();
    const normalized = normalizeAlias(alias);
    const ids = aliasIndex.get(normalized) ?? [];
    return ids.map(id => idIndex.get(id)!).filter(Boolean);
}

/** All books in canonical order. Useful for picker UI. */
export function getAllBooks(): ReadonlyArray<BibleCanonBook> {
    return BIBLE_CANON;
}

/** Books filtered by testament. */
export function getBooksByTestament(testament: Testament): BibleCanonBook[] {
    return BIBLE_CANON.filter(b => b.testament === testament);
}
