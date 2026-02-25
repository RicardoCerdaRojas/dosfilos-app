import { BibleReference } from '../entities/BibleEntities';

/**
 * Port (Interface) for Bible version repository access
 */
export interface IBibleVersionRepository {
    getVersionId(): string;
    getLanguage(): string;
    parseReference(reference: string): BibleReference | null;
    getVerses(reference: string): string | null;
    isValidBook(bookName: string): boolean;
    getBooks(): { id: string; name: string; chapters: number }[];
    getChapterCount(bookNameOrId: string): number;
    getVerseCount(bookNameOrId: string, chapter: number): number;
    getChapterContent(bookNameOrId: string, chapter: number): string[] | null;
    resolveBookId(query: string): string | null;
    search(query: string, limit?: number): { reference: string; text: string }[];
}
