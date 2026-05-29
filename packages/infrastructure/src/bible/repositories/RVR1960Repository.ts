import { IBibleVersionRepository, BibleReference } from '@dosfilos/domain';
import rvrBible from '../data/rvr1960.json';

/**
 * RVR1960 Repository — Adapter for Spanish Reina-Valera 1960 Bible.
 *
 * Implements IBibleVersionRepository (Dependency Inversion Principle).
 * Follows Adapter Pattern to convert RVR1960 JSON structure to domain
 * interface.
 *
 * Data structure: Array of books, each with nested chapters array
 * [{ id: "gen", chapters: [["verse1", "verse2", ...], ...] }]
 *
 * ⚠️ DUPLICATION WARNING (PR #281, 2026-05-29) ⚠️
 *
 * A FUNCTIONALLY DISTINCT copy of this class lives at
 * `packages/web/src/data/repositories/bible/RVR1960Repository.ts`. THIS
 * (infra) copy is the one wired into `LocalBibleService.parseReference()`,
 * which the SERMON WIZARD's Pasaje step + Faculty markdown citation
 * linker call. The web copy is wired into `/dashboard/bible` page
 * components (BibleContext + BibleReader + selectors).
 *
 * Contracts differ subtly:
 *   - This (infra) copy returns `book` as the BOOK_MAPPING KEY
 *     (`'Filemón'`), because `getVerses()` here keys back into
 *     BOOK_MAPPING to resolve the JSON id.
 *   - The web copy returns `book` as the abbreviation (`'phm'`).
 *
 * Any parser change here MUST be mirrored in the web copy or surfaces
 * will silently disagree on the same input. PR #280 only edited the web
 * copy and the wizard's parser kept rejecting "filemon" in production;
 * PR #281 (this) was the actual fix.
 *
 * Tech debt: `tech_debt_bible_parser_duplication` tracks consolidation.
 */
export class RVR1960Repository implements IBibleVersionRepository {
    private readonly BOOK_MAPPING: Record<string, string> = {
        // Antiguo Testamento
        'Génesis': 'gn', 'Genesis': 'gn', 'Gn': 'gn', 'Gen': 'gn', 'Gén': 'gn',
        'Éxodo': 'ex', 'Exodo': 'ex', 'Ex': 'ex', 'Éx': 'ex',
        'Levítico': 'lv', 'Levitico': 'lv', 'Lv': 'lv', 'Lev': 'lv',
        'Números': 'nm', 'Numeros': 'nm', 'Nm': 'nm', 'Num': 'nm', 'Núm': 'nm',
        'Deuteronomio': 'dt', 'Dt': 'dt', 'Deut': 'dt',
        'Josué': 'js', 'Josue': 'js', 'Jos': 'js',
        'Jueces': 'jud', 'Jue': 'jud',
        'Rut': 'rt', 'Rt': 'rt',
        '1 Samuel': '1sm', '1Samuel': '1sm', '1 Sam': '1sm', '1S': '1sm', '1Sm': '1sm',
        '2 Samuel': '2sm', '2Samuel': '2sm', '2 Sam': '2sm', '2S': '2sm', '2Sm': '2sm',
        '1 Reyes': '1kgs', '1Reyes': '1kgs', '1 Rey': '1kgs', '1R': '1kgs', '1Kgs': '1kgs',
        '2 Reyes': '2kgs', '2Reyes': '2kgs', '2 Rey': '2kgs', '2R': '2kgs', '2Kgs': '2kgs',
        '1 Crónicas': '1ch', '1Cronicas': '1ch', '1 Cro': '1ch', '1Cr': '1ch', '1Ch': '1ch',
        '2 Crónicas': '2ch', '2Cronicas': '2ch', '2 Cro': '2ch', '2Cr': '2ch', '2Ch': '2ch',
        'Esdras': 'ezr', 'Esd': 'ezr',
        'Nehemías': 'ne', 'Nehemias': 'ne', 'Neh': 'ne',
        'Ester': 'et', 'Est': 'et',
        'Job': 'job', 'Jb': 'job',
        'Salmos': 'ps', 'Sal': 'ps', 'Sl': 'ps', 'Salmo': 'ps',
        'Proverbios': 'prv', 'Prov': 'prv', 'Pr': 'prv',
        'Eclesiastés': 'ec', 'Eclesiastes': 'ec', 'Ecl': 'ec',
        'Cantares': 'so', 'Cant': 'so', 'Cnt': 'so',
        'Isaías': 'is', 'Isaias': 'is', 'Isa': 'is', 'Is': 'is',
        'Jeremías': 'jr', 'Jeremias': 'jr', 'Jer': 'jr',
        'Lamentaciones': 'lm', 'Lam': 'lm',
        'Ezequiel': 'ez', 'Eze': 'ez',
        'Daniel': 'dn', 'Dan': 'dn',
        'Oseas': 'ho', 'Os': 'ho',
        'Joel': 'jl', 'Jl': 'jl',
        'Amós': 'am', 'Amos': 'am', 'Am': 'am',
        'Abdías': 'ob', 'Abdias': 'ob', 'Abd': 'ob',
        'Jonás': 'jn', 'Jonas': 'jn', 'Jon': 'jn',
        'Miqueas': 'mi', 'Miq': 'mi',
        'Nahúm': 'na', 'Nahum': 'na', 'Nah': 'na',
        'Habacuc': 'hk', 'Hab': 'hk',
        'Sofonías': 'zp', 'Sofonias': 'zp', 'Sof': 'zp',
        'Hageo': 'hg', 'Hag': 'hg',
        'Zacarías': 'zc', 'Zacarias': 'zc', 'Zac': 'zc',
        'Malaquías': 'ml', 'Malaquias': 'ml', 'Mal': 'ml',

        // Nuevo Testamento - Spanish names
        'Mateo': 'mt', 'Mat': 'mt', 'Mt': 'mt',
        'Marcos': 'mk', 'Mar': 'mk', 'Mc': 'mk', 'Mr': 'mk',
        'Lucas': 'lk', 'Luc': 'lk', 'Lc': 'lk',
        'Juan': 'jo', 'Jn': 'jo',
        'Hechos': 'act', 'Hch': 'act', 'Hec': 'act',
        'Romanos': 'rm', 'Rom': 'rm', 'Ro': 'rm', 'Rm': 'rm',
        '1 Corintios': '1co', '1Corintios': '1co', '1Cor': '1co', '1 Cor': '1co', '1Co': '1co',
        '2 Corintios': '2co', '2Corintios': '2co', '2Cor': '2co', '2 Cor': '2co', '2Co': '2co',
        'Gálatas': 'gl', 'Galatas': 'gl', 'Gál': 'gl', 'Gal': 'gl', 'Ga': 'gl',
        'Efesios': 'eph', 'Ef': 'eph', 'Efe': 'eph',
        'Filipenses': 'ph', 'Fil': 'ph', 'Fp': 'ph',
        'Colosenses': 'col', 'Col': 'col',
        '1 Tesalonicenses': '1ts', '1Tesalonicenses': '1ts', '1Tes': '1ts', '1 Tes': '1ts', '1Ts': '1ts',
        '2 Tesalonicenses': '2ts', '2Tesalonicenses': '2ts', '2Tes': '2ts', '2 Tes': '2ts', '2Ts': '2ts',
        '1 Timoteo': '1ti', '1Timoteo': '1ti', '1Tim': '1ti', '1 Tim': '1ti', '1Ti': '1ti',
        '2 Timoteo': '2ti', '2Timoteo': '2ti', '2Tim': '2ti', '2 Tim': '2ti', '2Ti': '2ti',
        'Tito': 'tit', 'Tit': 'tit', 'Ti': 'tit',
        'Filemón': 'phm', 'Filemon': 'phm', 'Flm': 'phm', 'Flmn': 'phm',
        'Hebreos': 'hb', 'Heb': 'hb', 'He': 'hb',
        'Santiago': 'jm', 'Sant': 'jm', 'Stg': 'jm',
        '1 Pedro': '1pe', '1Pedro': '1pe', '1Ped': '1pe', '1 Ped': '1pe', '1Pe': '1pe', '1P': '1pe',
        '2 Pedro': '2pe', '2Pedro': '2pe', '2Ped': '2pe', '2 Ped': '2pe', '2Pe': '2pe', '2P': '2pe',
        '1 Juan': '1jo', '1Juan': '1jo', '1Jn': '1jo', '1 Jn': '1jo',
        '2 Juan': '2jo', '2Juan': '2jo', '2Jn': '2jo', '2 Jn': '2jo',
        '3 Juan': '3jo', '3Juan': '3jo', '3Jn': '3jo', '3 Jn': '3jo',
        'Judas': 'jd', 'Jud': 'jd',
        'Apocalipsis': 're', 'Apoc': 're', 'Ap': 're'
    };

    getVersionId(): string {
        return 'RVR1960';
    }

    getLanguage(): string {
        return 'es';
    }

    /**
     * Single-chapter book IDs (RVR numbering). For these books a
     * chapter-less verse-only reference is canonical (e.g. "Filemón 8-21"
     * omits the chapter since Phlm only has one).
     */
    private static readonly SINGLE_CHAPTER_BOOK_IDS = new Set([
        'ob',  // Abdías
        'phm', // Filemón
        '2jo', // 2 Juan
        '3jo', // 3 Juan
        'jd',  // Judas
    ]);

    /**
     * Parse a reference string into a structured `BibleReference`. Returns
     * `book` as the BOOK MAPPING KEY (display name like "Filemón"), which
     * is what downstream consumers in this package expect.
     *
     * Accepted shapes (sentinel `0` means "no specific value"):
     *   Book only            "Filemón"        → { chapter: 1, verseStart: 0 }
     *   Book + chapter       "Romanos 1"      → { chapter: 1, verseStart: 0 }
     *   Book + ch:verse      "Juan 3:16"      → { chapter: 3, verseStart: 16 }
     *   Book + ch:verseRange "Juan 3:16-17"   → { chapter: 3, verseStart: 16, verseEnd: 17 }
     *   Single-chap + verse  "Filemón 8"      → { chapter: 1, verseStart: 8 }
     *   Single-chap + range  "Filemón 8-21"   → { chapter: 1, verseStart: 8, verseEnd: 21 }
     */
    parseReference(ref: string): BibleReference | null {
        const normalized = ref.trim();
        const match = normalized.match(
            /^((?:[1-3]\s?)?[A-ZÁÉÍÓÚÑa-záéíóúñ]+(?:\s+de\s+los\s+[A-ZÁÉÍÓÚÑa-záéíóúñ]+)?)(?:\s+(\d+)(?:[-–](\d+))?(?:[:.](\d+)(?:[-–](\d+))?)?)?$/i,
        );

        if (!match) return null;

        const bookName = match[1]?.trim() || '';
        const normalize = (s: string) =>
            s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
        const normalizedInput = normalize(bookName);
        // Diacritic-insensitive lookup. Returning the FIRST matching key
        // (Object.entries preserves insertion order) is intentional —
        // BOOK_MAPPING lists the canonical accented form before its
        // unaccented aliases, so a user typing "filemon" still resolves
        // to `book: "Filemón"` (the form `getBooks()` exposes to the UI).
        // Fix for Filemón Bible-panel-empty bug, smoke 2026-05-29.
        let resolvedKey = '';
        let resolvedId = '';
        for (const [key, value] of Object.entries(this.BOOK_MAPPING)) {
            if (normalize(key) === normalizedInput) {
                resolvedKey = key;
                resolvedId = value;
                break;
            }
        }
        if (!resolvedKey) return null;

        const num1 = match[2] ? parseInt(match[2]) : undefined;
        const num1End = match[3] ? parseInt(match[3]) : undefined;
        const num2 = match[4] ? parseInt(match[4]) : undefined;
        const num2End = match[5] ? parseInt(match[5]) : undefined;

        const isSingleChapter = RVR1960Repository.SINGLE_CHAPTER_BOOK_IDS.has(resolvedId);

        let chapter: number;
        let verseStart: number;
        let verseEnd: number | undefined;

        if (num1 === undefined) {
            // Book only.
            chapter = 1;
            verseStart = 0;
            verseEnd = undefined;
        } else if (num2 === undefined) {
            if (isSingleChapter) {
                // "Filemón 8" or "Filemón 8-21" — num1 is the verse.
                chapter = 1;
                verseStart = num1;
                verseEnd = num1End;
            } else {
                // "Romanos 1" — whole chapter. Reject chapter ranges.
                if (num1End !== undefined) return null;
                chapter = num1;
                verseStart = 0;
                verseEnd = undefined;
            }
        } else {
            // Standard chapter:verse(range).
            if (num1End !== undefined) return null;
            chapter = num1;
            verseStart = num2;
            verseEnd = num2End;
        }

        return {
            book: resolvedKey,
            chapter,
            verseStart,
            verseEnd,
        };
    }

    getVerses(refString: string): string | null {
        const ref = this.parseReference(refString);
        if (!ref) {
            return null;
        }

        const bookId = this.BOOK_MAPPING[ref.book];
        if (!bookId) return null;

        const bookData = (rvrBible as any[]).find(b => b.id === bookId);
        if (!bookData) {
            return null;
        }

        const chapterIndex = ref.chapter - 1;
        if (chapterIndex < 0 || chapterIndex >= bookData.chapters.length) {
            return null;
        }

        const chapterVerses = bookData.chapters[chapterIndex];
        const startVerseIndex = ref.verseStart - 1;
        if (startVerseIndex < 0 || startVerseIndex >= chapterVerses.length) {
            return null;
        }

        let text = '';
        if (ref.verseEnd) {
            const endVerseIndex = Math.min(ref.verseEnd - 1, chapterVerses.length - 1);
            for (let i = startVerseIndex; i <= endVerseIndex; i++) {
                const verseNum = i + 1;
                text += `${verseNum} ${chapterVerses[i].replace(/\s*\/n\s*/g, ' ').trim()} `;
            }
        } else {
            text = chapterVerses[startVerseIndex].replace(/\s*\/n\s*/g, ' ').trim();
        }

        return text.trim();
    }

    isValidBook(bookName: string): boolean {
        const normalized = bookName.trim().toLowerCase();
        return Object.keys(this.BOOK_MAPPING).some(key => key.toLowerCase() === normalized);
    }

    /**
     * Canonical Protestant Bible order. The source `rvr1960.json` ships
     * books sorted alphabetically by id (`1ch, 1co, 1jo, …`) which makes
     * any UI dropdown sourced from it surface a non-canonical list.
     * Returning them in this fixed order is the simplest way to honour
     * the reader expectation. Fix for smoke 2026-05-29.
     */
    private static readonly CANONICAL_ORDER: readonly string[] = [
        'gn', 'ex', 'lv', 'nm', 'dt', 'js', 'jud', 'rt',
        '1sm', '2sm', '1kgs', '2kgs', '1ch', '2ch',
        'ezr', 'ne', 'et', 'job', 'ps', 'prv', 'ec', 'so',
        'is', 'jr', 'lm', 'ez', 'dn',
        'ho', 'jl', 'am', 'ob', 'jn', 'mi', 'na', 'hk', 'zp', 'hg', 'zc', 'ml',
        'mt', 'mk', 'lk', 'jo', 'act', 'rm',
        '1co', '2co', 'gl', 'eph', 'ph', 'col',
        '1ts', '2ts', '1ti', '2ti', 'tit', 'phm', 'hb', 'jm',
        '1pe', '2pe', '1jo', '2jo', '3jo', 'jd', 're',
    ];

    getBooks(): { id: string; name: string }[] {
        const books = (rvrBible as any[]).map(b => {
            let name = b.id.toUpperCase();
            for (const [key, val] of Object.entries(this.BOOK_MAPPING)) {
                if (val === b.id && key.length > 3 && key[0] === key[0].toUpperCase()) {
                    name = key;
                    break;
                }
            }
            return { id: b.id as string, name };
        });
        const order = RVR1960Repository.CANONICAL_ORDER;
        // Unknown ids (shouldn't happen, but defensive) fall to the end
        // in their existing relative order via `indexOf` returning -1.
        return books.sort((a, b) => {
            const ai = order.indexOf(a.id);
            const bi = order.indexOf(b.id);
            const aa = ai === -1 ? Number.MAX_SAFE_INTEGER : ai;
            const bb = bi === -1 ? Number.MAX_SAFE_INTEGER : bi;
            return aa - bb;
        });
    }

    getChapterCount(bookNameOrId: string): number {
        let bookId = bookNameOrId;
        if (this.BOOK_MAPPING[bookNameOrId]) {
            bookId = this.BOOK_MAPPING[bookNameOrId];
        }

        const book = (rvrBible as any[]).find(b => b.id === bookId);
        return book ? book.chapters.length : 0;
    }

    getChapterContent(bookNameOrId: string, chapter: number): string[] | null {
        let bookId = bookNameOrId;
        if (this.BOOK_MAPPING[bookNameOrId]) {
            bookId = this.BOOK_MAPPING[bookNameOrId];
        }

        const book = (rvrBible as any[]).find(b => b.id === bookId);
        if (!book) return null;

        const chapterIdx = chapter - 1;
        if (chapterIdx < 0 || chapterIdx >= book.chapters.length) return null;

        return book.chapters[chapterIdx].map((verse: string) => verse ? verse.replace(/\s*\/n\s*/g, ' ').trim() : verse);
    }

    search(query: string, limit = 20): { reference: string; text: string }[] {
        const results: { reference: string; text: string }[] = [];
        const q = query.toLowerCase().trim();
        if (!q || q.length < 3) return [];

        let count = 0;
        const books = rvrBible as any[];

        for (const book of books) {
            let bookName = book.id.toUpperCase();
            for (const [key, val] of Object.entries(this.BOOK_MAPPING)) {
                if (val === book.id && key.length > 3 && key[0] === key[0].toUpperCase()) {
                    bookName = key;
                    break;
                }
            }

            for (let c = 0; c < book.chapters.length; c++) {
                const chapter = book.chapters[c];
                for (let v = 0; v < chapter.length; v++) {
                    const verseText = chapter[v];
                    if (verseText.toLowerCase().includes(q)) {
                        results.push({
                            reference: `${bookName} ${c + 1}:${v + 1}`,
                            text: verseText.replace(/\s*\/n\s*/g, ' ').trim()
                        });
                        count++;
                        if (count >= limit) return results;
                    }
                }
            }
        }
        return results;
    }
}
