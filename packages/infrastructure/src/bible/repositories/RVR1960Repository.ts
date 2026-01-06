import { IBibleVersionRepository, BibleReference } from '@dosfilos/domain';
import rvrBible from '../data/rvr1960.json';

/**
 * RVR1960 Repository - Adapter for Spanish Reina-Valera 1960 Bible
 * 
 * Implements IBibleVersionRepository (Dependency Inversion Principle)
 * Follows Adapter Pattern to convert RVR1960 JSON structure to domain interface
 * 
 * Data structure: Array of books, each with nested chapters array
 * [{ id: "gen", chapters: [["verse1", "verse2", ...], ...] }]
 */
export class RVR1960Repository implements IBibleVersionRepository {
    private readonly BOOK_MAPPING: Record<string, string> = {
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

    parseReference(ref: string): BibleReference | null {
        const normalized = ref.trim();
        const match = normalized.match(/^((?:[1-3]\s?)?[A-ZÁÉÍÓÚÑa-záéíóúñ]+(?:\s+de\s+los\s+[A-ZÁÉÍÓÚÑa-záéíóúñ]+)?)\s*(\d+)[:.](\d+)(?:[-–](\d+))?$/i);

        if (!match) return null;

        const bookName = match[1]?.trim() || '';
        let resolvedBook = '';
        for (const [key] of Object.entries(this.BOOK_MAPPING)) {
            if (key.toLowerCase() === bookName.toLowerCase()) {
                resolvedBook = key;
                break;
            }
        }

        if (!resolvedBook) return null;

        return {
            book: resolvedBook,
            chapter: parseInt(match[2] || '0'),
            verseStart: parseInt(match[3] || '0'),
            verseEnd: match[4] ? parseInt(match[4]) : undefined
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
                text += `${verseNum} ${chapterVerses[i]} `;
            }
        } else {
            text = chapterVerses[startVerseIndex];
        }

        return text.trim();
    }

    isValidBook(bookName: string): boolean {
        const normalized = bookName.trim().toLowerCase();
        return Object.keys(this.BOOK_MAPPING).some(key => key.toLowerCase() === normalized);
    }

    getBooks(): { id: string; name: string }[] {
        return (rvrBible as any[]).map(b => {
            let name = b.id.toUpperCase();
            for (const [key, val] of Object.entries(this.BOOK_MAPPING)) {
                if (val === b.id && key.length > 3 && key[0] === key[0].toUpperCase()) {
                    name = key;
                    break;
                }
            }
            return { id: b.id, name };
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

        return book.chapters[chapterIdx];
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
                            text: verseText
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
