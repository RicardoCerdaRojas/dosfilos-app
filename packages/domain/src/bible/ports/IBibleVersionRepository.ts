import { BibleReference } from '../entities/BibleEntities';

/**
 * Port (Interface) for Bible version repository access
 * 
 * Follows SOLID principles:
 * - Dependency Inversion Principle: High-level modules depend on this abstraction
 * - Interface Segregation Principle: Focused interface with only necessary methods
 * - Liskov Substitution: Any implementation can be substituted
 * 
 * This allows multiple Bible versions (RVR1960, KJV, NIV, etc.) 
 * to be used interchangeably throughout the application.
 */
export interface IBibleVersionRepository {
    /**
     * Get version identifier (e.g., "RVR1960", "KJV")
     */
    getVersionId(): string;

    /**
     * Get language code (e.g., "es", "en")
     */
    getLanguage(): string;

    /**
     * Parse reference string to structured format
     * @example parseReference("Juan 3:16") → { book: "Juan", chapter: 3, verseStart: 16 }
     * @example parseReference("John 3:16") → { book: "John", chapter: 3, verseStart: 16 }
     */
    parseReference(reference: string): BibleReference | null;

    /**
     * Get verses text for a reference
     * @example getVerses("Juan 3:16") → "Porque de tal manera amó Dios..."
     * @example getVerses("Juan 3:16-17") → "16 Porque de tal manera... 17 Porque no..."
     */
    getVerses(reference: string): string | null;

    /**
     * Check if book name is valid in this version
     * @example isValidBook("Juan") → true (RVR1960)
     * @example isValidBook("John") → true (KJV)
     */
    isValidBook(bookName: string): boolean;

    /**
     * Get all books available in this version
     */
    getBooks(): { id: string; name: string }[];

    /**
     * Get number of chapters for a book
     */
    getChapterCount(bookNameOrId: string): number;

    /**
     * Get full content of a chapter
     */
    getChapterContent(bookNameOrId: string, chapter: number): string[] | null;

    /**
     * Search for verses containing query
     */
    search(query: string, limit?: number): { reference: string; text: string }[];
}
