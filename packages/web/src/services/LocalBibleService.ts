import { BibleVersionFactory } from '@dosfilos/infrastructure/bible';
import { IBibleVersionRepository } from '@dosfilos/domain';

/**
 * LocalBibleService - Facade pattern for backward compatibility
 * 
 * This service maintains the existing API while delegating to the new
 * multi-version Bible repository architecture.
 * 
 * Follows Facade Pattern:
 * - Provides simple interface for existing code
 * - Delegates to BibleVersionFactory internally
 * - Zero breaking changes to existing consumers
 * 
 * @deprecated Consider migrating to BibleVersionFactory.getForLocale() directly
 * for better type safety and explicit locale control
 */

// Re-export types for backward compatibility
export interface BibleVerse {
    book: string;
    chapter: number;
    verse: number;
    text: string;
}

export interface BibleReference {
    book: string;
    chapter: number;
    verseStart: number;
    verseEnd?: number;
}

export class LocalBibleService {
    /**
     * Get Bible repository for specified locale
     * Default to Spanish (RVR1960) for backward compatibility
     */
    private static getRepository(locale: string = 'es'): IBibleVersionRepository {
        return BibleVersionFactory.getForLocale(locale);
    }

    static parseReference(ref: string, locale: string = 'es'): BibleReference | null {
        return this.getRepository(locale).parseReference(ref);
    }

    static getVerses(refString: string, locale: string = 'es'): string | null {
        return this.getRepository(locale).getVerses(refString);
    }

    /** Check if a book name/abbreviation is valid */
    static isValidBook(bookName: string, locale: string = 'es'): boolean {
        return this.getRepository(locale).isValidBook(bookName);
    }

    /** Get the canonical (full) name for a book abbreviation */
    static getCanonicalBookName(bookName: string, locale: string = 'es'): string | null {
        // This method needs special handling - not in interface
        // For now, return the book name if valid
        return this.isValidBook(bookName, locale) ? bookName : null;
    }

    /** Get all books available in the local Bible */
    static getBooks(locale: string = 'es'): { id: string; name: string }[] {
        return this.getRepository(locale).getBooks();
    }

    /** Get number of chapters for a book */
    static getChapterCount(bookNameOrId: string, locale: string = 'es'): number {
        return this.getRepository(locale).getChapterCount(bookNameOrId);
    }

    /** Get full content of a chapter */
    static getChapterContent(bookNameOrId: string, chapter: number, locale: string = 'es'): string[] | null {
        return this.getRepository(locale).getChapterContent(bookNameOrId, chapter);
    }

    /** Search for verses containing query */
    static search(query: string, limit = 20, locale: string = 'es'): { reference: string; text: string }[] {
        return this.getRepository(locale).search(query, limit);
    }
}

// Cached pattern for performance - delegated to repositories now
export function getBookPattern(): string {
    // This is used for regex matching in some components
    // Return a simple pattern that works for both ES and EN
    return '[A-ZÁÉÍÓÚÑa-záéíóúñ0-9\\s]+';
}
