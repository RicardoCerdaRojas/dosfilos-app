import { IBibleVersionRepository, BibleReference } from '@dosfilos/domain';
import asvBible from '@/assets/bible/asv.json';

/**
 * Interface for ASV JSON structure
 */
interface ASVVerse {
    book_name: string;
    book: number;
    chapter: number;
    verse: number;
    text: string;
}

interface ASVData {
    metadata: {
        name: string;
        shortname: string;
        module: string;
        year: string;
    };
    verses: ASVVerse[];
}

/**
 * ASV (American Standard Version) Repository - Adapter for English Bible
 * 
 * Implements IBibleVersionRepository (Dependency Inversion Principle)
 * Follows Adapter Pattern to convert ASV flat-array structure to domain interface
 * 
 * Data structure: Flat array of ~31,000 verses
 * { verses: [{ book_name: "Genesis", book: 1, chapter: 1, verse: 1, text: "..." }, ...] }
 */
export class ASVRepository implements IBibleVersionRepository {
    private readonly data: ASVData;

    private readonly BOOK_MAPPING: Record<string, number> = {
        // New Testament - English names
        'Matthew': 40, 'Matt': 40, 'Mt': 40,
        'Mark': 41, 'Mk': 41, 'Mr': 41,
        'Luke': 42, 'Lk': 42, 'Lc': 42,
        'John': 43, 'Jn': 43,
        'Acts': 44,
        'Romans': 45, 'Rom': 45, 'Ro': 45, 'Rm': 45,
        '1 Corinthians': 46, '1Corinthians': 46, '1Cor': 46, '1 Cor': 46, '1Co': 46,
        '2 Corinthians': 47, '2Corinthians': 47, '2Cor': 47, '2 Cor': 47, '2Co': 47,
        'Galatians': 48, 'Gal': 48, 'Ga': 48,
        'Ephesians': 49, 'Eph': 49, 'Ef': 49,
        'Philippians': 50, 'Phil': 50, 'Php': 50, 'Php': 50,
        'Colossians': 51, 'Col': 51,
        '1 Thessalonians': 52, '1Thessalonians': 52, '1Thess': 52, '1 Thess': 52, '1Th': 52,
        '2 Thessalonians': 53, '2Thessalonians': 53, '2Thess': 53, '2 Thess': 53, '2Th': 53,
        '1 Timothy': 54, '1Timothy': 54, '1Tim': 54, '1 Tim': 54, '1Ti': 54,
        '2 Timothy': 55, '2Timothy': 55, '2Tim': 55, '2 Tim': 55, '2Ti': 55,
        'Titus': 56, 'Tit': 56, 'Ti': 56,
        'Philemon': 57, 'Phlm': 57, 'Phm': 57,
        'Hebrews': 58, 'Heb': 58, 'He': 58,
        'James': 59, 'Jas': 59, 'Jm': 59,
        '1 Peter': 60, '1Peter': 60, '1Pet': 60, '1 Pet': 60, '1Pe': 60, '1P': 60,
        '2 Peter': 61, '2Peter': 61, '2Pet': 61, '2 Pet': 61, '2Pe': 61, '2P': 61,
        '1 John': 62, '1John': 62, '1Jn': 62, '1 Jn': 62,
        '2 John': 63, '2John': 63, '2Jn': 63, '2 Jn': 63,
        '3 John': 64, '3John': 64, '3Jn': 64, '3 Jn': 64,
        'Jude': 65,
        'Revelation': 66, 'Rev': 66, 'Re': 66
    };

    constructor() {
        this.data = asvBible as ASVData;
    }

    getVersionId(): string {
        return 'ASV';
    }

    getLanguage(): string {
        return 'en';
    }

    parseReference(ref: string): BibleReference | null {
        const normalized = ref.trim();
        console.log('[ASVRepository] parseReference input:', normalized);

        // English pattern: "John 3:16" or "1 John 3:16-17"
        const match = normalized.match(/^((?:[1-3]\s?)?[A-Za-z]+(?:\s+[A-Za-z]+)*)\s*(\d+)[:.](\d+)(?:[-–](\d+))?$/i);

        console.log('[ASVRepository] regex match:', match);

        if (!match) return null;

        const bookName = match[1]?.trim() || '';
        console.log('[ASVRepository] bookName extracted:', bookName);

        let resolvedBook = '';
        for (const [key] of Object.entries(this.BOOK_MAPPING)) {
            if (key.toLowerCase() === bookName.toLowerCase()) {
                resolvedBook = key;
                break;
            }
        }

        console.log('[ASVRepository] resolvedBook:', resolvedBook, 'bookNumber:', this.BOOK_MAPPING[resolvedBook]);

        if (!resolvedBook) return null;

        return {
            book: resolvedBook,
            chapter: parseInt(match[2] || '0'),
            verseStart: parseInt(match[3] || '0'),
            verseEnd: match[4] ? parseInt(match[4]) : undefined
        };
    }

    getVerses(refString: string): string | null {
        console.log('[ASVRepository] getVerses called with:', refString);

        const ref = this.parseReference(refString);
        console.log('[ASVRepository] parsed reference:', ref);

        if (!ref) return null;

        const bookNumber = this.BOOK_MAPPING[ref.book];
        console.log('[ASVRepository] bookNumber:', bookNumber);

        if (!bookNumber) return null;

        // Filter verses for this reference
        const verses = this.data.verses.filter(v =>
            v.book === bookNumber &&
            v.chapter === ref.chapter &&
            v.verse >= ref.verseStart &&
            (!ref.verseEnd || v.verse <= ref.verseEnd)
        );

        console.log('[ASVRepository] filtered verses count:', verses.length);
        console.log('[ASVRepository] first verse sample:', verses[0]);

        if (verses.length === 0) return null;

        // Format output
        if (ref.verseEnd) {
            return verses.map(v => `${v.verse} ${v.text}`).join(' ');
        } else {
            return verses[0].text;
        }
    }

    isValidBook(bookName: string): boolean {
        const normalized = bookName.trim().toLowerCase();
        return Object.keys(this.BOOK_MAPPING).some(key => key.toLowerCase() === normalized);
    }

    getBooks(): { id: string; name: string }[] {
        // Get unique books from verses
        const uniqueBooks = new Map<number, string>();
        this.data.verses.forEach(v => {
            if (!uniqueBooks.has(v.book)) {
                uniqueBooks.set(v.book, v.book_name);
            }
        });

        return Array.from(uniqueBooks.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([bookNum, bookName]) => ({
                id: bookNum.toString(),
                name: bookName
            }));
    }

    getChapterCount(bookNameOrId: string): number {
        let bookNumber: number;

        if (/^\d+$/.test(bookNameOrId)) {
            bookNumber = parseInt(bookNameOrId);
        } else {
            const mapped = this.BOOK_MAPPING[bookNameOrId];
            if (!mapped) return 0;
            bookNumber = mapped;
        }

        const chapters = new Set(
            this.data.verses
                .filter(v => v.book === bookNumber)
                .map(v => v.chapter)
        );

        return chapters.size;
    }

    getChapterContent(bookNameOrId: string, chapter: number): string[] | null {
        let bookNumber: number;

        if (/^\d+$/.test(bookNameOrId)) {
            bookNumber = parseInt(bookNameOrId);
        } else {
            const mapped = this.BOOK_MAPPING[bookNameOrId];
            if (!mapped) return null;
            bookNumber = mapped;
        }

        const verses = this.data.verses
            .filter(v => v.book === bookNumber && v.chapter === chapter)
            .sort((a, b) => a.verse - b.verse)
            .map(v => v.text);

        return verses.length > 0 ? verses : null;
    }

    search(query: string, limit = 20): { reference: string; text: string }[] {
        const results: { reference: string; text: string }[] = [];
        const q = query.toLowerCase().trim();
        if (!q || q.length < 3) return [];

        for (const verse of this.data.verses) {
            if (verse.text.toLowerCase().includes(q)) {
                results.push({
                    reference: `${verse.book_name} ${verse.chapter}:${verse.verse}`,
                    text: verse.text
                });

                if (results.length >= limit) break;
            }
        }

        return results;
    }
}
