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

        const canonicalBookId = this.bookMapping[ref.book];
        if (!canonicalBookId) return null;

        const book = this.bibleData.find(b => b.id.toLowerCase() === canonicalBookId.toLowerCase());
        if (!book) return null;

        const chapterIdx = ref.chapter - 1;
        if (chapterIdx < 0 || chapterIdx >= book.chapters.length) return null;

        const chapter = book.chapters[chapterIdx];
        const verses = chapter.slice(ref.verseStart - 1, ref.verseEnd ? ref.verseEnd : ref.verseStart);

        return verses.join(' ').replace(/\\s*\\n\\s*/g, ' ').trim();
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
            // El nombre sale de la tabla de alias: se elige el MÁS LARGO que
            // empiece en mayúscula. Pedir más de tres letras dejaba a Rut y a
            // Job sin nombre —se veían como "RT" y "JOB"— porque su nombre
            // completo tiene exactamente tres.
            let name = b.id.toUpperCase();
            let best = '';
            for (const [key, val] of Object.entries(this.bookMapping)) {
                if (val !== b.id) continue;
                if (key[0] !== key[0].toUpperCase()) continue;
                if (key.length > best.length) best = key;
            }
            if (best) name = best;
            return { id: b.id, name, chapters: b.chapters.length };
        });

        return this.booksCache;
    }

    /**
     * Traduce lo que llegue —id del propio dato o nombre del libro— al id real.
     *
     * EL ID SE PRUEBA PRIMERO, Y NO ES UN DETALLE. Antes se buscaba por NOMBRE
     * antes que por id, y en este juego de datos Jonás es `jn` mientras que
     * `Jn` es un alias de Juan. Pedir el capítulo de `jn` devolvía Juan 1: la
     * cabecera decía "Jonás 1" —esa sí resuelve por id— y el cuerpo mostraba
     * "En el principio era el Verbo". Un id nunca debe caer en la tabla de
     * alias de otro libro.
     */
    resolveBookId(bookNameOrId: string): string {
        const direct = this.bibleData.find(
            (b) => b.id.toLowerCase() === bookNameOrId.toLowerCase(),
        );
        if (direct) return direct.id;

        const searchName = bookNameOrId.toLowerCase();
        for (const [key, val] of Object.entries(this.bookMapping)) {
            if (key.toLowerCase() === searchName) return val;
        }
        return bookNameOrId;
    }

    getChapterCount(bookNameOrId: string): number {
        const bookId = this.resolveBookId(bookNameOrId);
        const book = this.bibleData.find(b => b.id.toLowerCase() === bookId.toLowerCase());
        return book ? book.chapters.length : 0;
    }

    getChapterContent(bookNameOrId: string, chapter: number): string[] | null {
        const bookId = this.resolveBookId(bookNameOrId);
        const book = this.bibleData.find(b => b.id.toLowerCase() === bookId.toLowerCase());
        if (!book) return null;

        const chapterIdx = chapter - 1;
        if (chapterIdx < 0 || chapterIdx >= book.chapters.length) return null;

        return book.chapters[chapterIdx].map(verse => verse ? verse.replace(/\\s*\\n\\s*/g, ' ').trim() : verse);
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
                for (let v = 0; v < chapter.length; v++) {
                    const verseText = chapter[v];
                    if (verseText.toLowerCase().includes(q)) {
                        results.push({
                            reference: `${bInfo.name} ${c + 1}:${v + 1}`,
                            text: verseText.replace(/\\s*\\n\\s*/g, ' ').trim()
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
