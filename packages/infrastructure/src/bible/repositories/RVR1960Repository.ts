import {
    IBibleVersionRepository,
    BibleReference,
    parsePassageReference,
    BIBLE_BOOKS_ES,
    parseBibleReferenceParts,
} from '@dosfilos/domain';
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
    private readonly BOOK_MAPPING = BIBLE_BOOKS_ES;

    getVersionId(): string {
        return 'RVR1960';
    }

    getLanguage(): string {
        return 'es';
    }


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
    /**
     * Delega en el parseo COMPARTIDO del dominio.
     *
     * Estaba escrita acá letra por letra igual que en la copia de la página de
     * Biblia, cada una con su propia tabla de libros — y las tablas ya habían
     * divergido: ésta reconocía `Gén`, `Éx` y `Núm`, y la otra no.
     *
     * Se conserva el contrato de salida (`book` = la CLAVE acentuada,
     * `'Filemón'`) porque `getVerses()` vuelve a entrar por ella en la tabla y
     * porque es la forma que se le muestra al pastor.
     */
    parseReference(ref: string): BibleReference | null {
        const parts = parseBibleReferenceParts(ref);
        if (!parts) return null;
        return {
            book: parts.bookKey,
            chapter: parts.chapter,
            verseStart: parts.verseStart,
            verseEnd: parts.verseEnd,
        };
    }

    /**
     * Resolve a JSON book id (`'2pe'`) from a canon Spanish name (`'2 Pedro'`),
     * diacritic-insensitive, reusing BOOK_MAPPING. Used by the cross-chapter
     * path so it doesn't need its own book table.
     */
    private resolveJsonId(nameEs: string): string | null {
        const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
        const target = norm(nameEs);
        for (const [key, value] of Object.entries(this.BOOK_MAPPING)) {
            if (norm(key) === target) return value;
        }
        return null;
    }

    /**
     * Cross-chapter ranges (e.g. "Juan 1:50-2:2") — the local `parseReference`
     * is single-chapter only (rejects a chapter boundary). Detect + resolve them
     * by delegating to the canon parser `parsePassageReference` (cross-chapter
     * capable + canon-validated), then concatenate verses across the chapter
     * range. Reusing the canon parser avoids duplicating regex logic a THIRD
     * time (cf. `tech_debt_bible_parser_duplication`) — it's the consolidation
     * direction, not new duplication.
     *
     * Returns the text when this IS a cross-chapter ref (or `null` if invalid),
     * and `undefined` when it is NOT cross-chapter — so `getVerses` falls
     * through to the unchanged single-chapter path (zero regression).
     */
    private getVersesCrossChapter(refString: string): string | null | undefined {
        const parsed = parsePassageReference(refString);
        if (!parsed.ok) return undefined;
        const { bookId: _bookId, chapterStart, chapterEnd, verseStart, verseEnd } = parsed.ref;
        if (chapterStart === chapterEnd) return undefined; // single-chapter → existing path

        const jsonId = this.resolveJsonId(parsed.book.nameEs);
        if (!jsonId) return null;
        const bookData = (rvrBible as any[]).find((b) => b.id === jsonId);
        if (!bookData) return null;

        let text = '';
        for (let c = chapterStart; c <= chapterEnd; c++) {
            const chapterVerses = bookData.chapters[c - 1];
            if (!chapterVerses) return null; // chapter out of range
            const from = c === chapterStart ? (verseStart ?? 1) : 1;
            const to = c === chapterEnd ? (verseEnd ?? chapterVerses.length) : chapterVerses.length;
            for (let v = from; v <= Math.min(to, chapterVerses.length); v++) {
                const verse = chapterVerses[v - 1];
                if (verse === undefined) continue;
                text += `${c}:${v} ${String(verse).replace(/\s*\/n\s*/g, ' ').trim()} `;
            }
        }
        const trimmed = text.trim();
        return trimmed || null;
    }

    getVerses(refString: string): string | null {
        const cross = this.getVersesCrossChapter(refString);
        if (cross !== undefined) return cross;

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
