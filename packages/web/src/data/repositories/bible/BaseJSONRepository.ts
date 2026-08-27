import { IBibleVersionRepository } from '@/domain/bible/ports/IBibleVersionRepository';
import { BibleReference } from '@/domain/bible/entities/BibleEntities';
import { getCanonicalId, BOOK_METADATA } from '@/domain/bible/utils/BibleMetadata';

export interface BibleJSONData {
    id: string;
    chapters: string[][];
}

/**
 * Base Repository for JSON-based Bible versions
 */
export abstract class BaseJSONRepository implements IBibleVersionRepository {
    protected abstract readonly versionId: string;
    protected abstract readonly language: string;
    protected abstract readonly bibleData: BibleJSONData[];
    protected abstract readonly bookMapping: Record<string, string>;

    private booksCache: { id: string; name: string; chapters: number }[] | null = null;

    getVersionId(): string {
        return this.versionId;
    }

    getLanguage(): string {
        return this.language;
    }

    abstract parseReference(reference: string): BibleReference | null;

    getVerses(reference: string): string | null {
        const ref = this.parseReference(reference);
        if (!ref) return null;

        // `?? ref.book` NO ES DEFENSA DE MÁS: las dos subclases devuelven el
        // ID del libro (`'phm'`) en `parseReference`, no la clave, así que
        // indexar la tabla con eso daba `undefined` SIEMPRE y este método
        // devolvía `null` para toda referencia. No se notó porque las pantallas
        // leen por `LocalBibleService`; quedaba muerto y roto esperando al
        // primero que lo usara.
        const canonicalBookId = this.bookMapping[ref.book] ?? ref.book;
        if (!canonicalBookId) return null;

        const book = this.bibleData.find(b => b.id.toLowerCase() === canonicalBookId.toLowerCase());
        if (!book) return null;

        const chapterIdx = ref.chapter - 1;
        if (chapterIdx < 0 || chapterIdx >= book.chapters.length) return null;

        const chapter = book.chapters[chapterIdx];
        if (!chapter) return null;

        const verses = chapter.slice(ref.verseStart - 1, ref.verseEnd ? ref.verseEnd : ref.verseStart);

        return verses.join(' ').replace(/\s*\/n\s*/g, ' ').trim();
    }

    isValidBook(bookName: string): boolean {
        const normalized = bookName.trim().toLowerCase();
        return Object.keys(this.bookMapping).some(key => key.toLowerCase() === normalized);
    }

    getBooks(): { id: string; name: string; chapters: number }[] {
        if (this.booksCache) return this.booksCache;

        const sortedData = [...this.bibleData].sort((a, b) => {
            const idA = getCanonicalId(a.id, this.versionId);
            const idB = getCanonicalId(b.id, this.versionId);
            const numA = BOOK_METADATA[idA]?.num || 999;
            const numB = BOOK_METADATA[idB]?.num || 999;
            return numA - numB;
        });

        this.booksCache = sortedData.map(b => {
            let name = b.id.toUpperCase();
            // Try to find a human readable name from mapping
            for (const [key, val] of Object.entries(this.bookMapping)) {
                if (val.toLowerCase() === b.id.toLowerCase() && key.length > 2 && key[0] === key[0].toUpperCase()) {
                    name = key;
                    break;
                }
            }
            return { id: b.id, name, chapters: b.chapters.length };
        });

        return this.booksCache;
    }

    getChapterCount(bookNameOrId: string): number {
        let bookId = bookNameOrId;
        const searchName = bookNameOrId.toLowerCase();

        for (const [key, val] of Object.entries(this.bookMapping)) {
            if (key.toLowerCase() === searchName) {
                bookId = val;
                break;
            }
        }

        const book = this.bibleData.find(b => b.id.toLowerCase() === bookId.toLowerCase());
        return book ? book.chapters.length : 0;
    }

    getVerseCount(bookNameOrId: string, chapter: number): number {
        const content = this.getChapterContent(bookNameOrId, chapter);
        return content ? content.length : 0;
    }

    getChapterContent(bookNameOrId: string, chapter: number): string[] | null {
        let bookId = bookNameOrId;
        const searchName = bookNameOrId.toLowerCase();

        for (const [key, val] of Object.entries(this.bookMapping)) {
            if (key.toLowerCase() === searchName) {
                bookId = val;
                break;
            }
        }

        const book = this.bibleData.find(b => b.id.toLowerCase() === bookId.toLowerCase());
        if (!book) return null;

        const chapterIdx = chapter - 1;
        if (chapterIdx < 0 || chapterIdx >= book.chapters.length) return null;

        const chapterContent = book.chapters[chapterIdx];
        if (!chapterContent) return null;

        // Clean any poetic newline markers
        return chapterContent.map(verse => verse ? verse.replace(/\s*\/n\s*/g, ' ').trim() : verse);
    }

    resolveBookId(query: string): string | null {
        const normalizedQuery = query.toLowerCase().trim();

        // Check exact ID match first
        const directMatch = this.bibleData.find(b => b.id.toLowerCase() === normalizedQuery);
        if (directMatch) return directMatch.id;

        // Check mapping
        for (const [key, val] of Object.entries(this.bookMapping)) {
            if (key.toLowerCase() === normalizedQuery) {
                return val;
            }
        }

        return null;
    }

    search(query: string, limit = 20): { reference: string; text: string }[] {
        const results: { reference: string; text: string }[] = [];
        const q = query.toLowerCase().trim();
        if (!q || q.length < 3) return [];

        let count = 0;
        const books = this.getBooks();

        for (const bInfo of books) {
            const book = this.bibleData.find(b => b.id === bInfo.id);
            if (!book) continue;

            for (let c = 0; c < book.chapters.length; c++) {
                const chapter = book.chapters[c];
                if (!chapter) continue;

                for (let v = 0; v < chapter.length; v++) {
                    const verseText = chapter[v];
                    if (verseText && verseText.toLowerCase().includes(q)) {
                        results.push({
                            reference: `${bInfo.name} ${c + 1}:${v + 1}`,
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
