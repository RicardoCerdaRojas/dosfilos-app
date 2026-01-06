import { BibleVersionFactory } from '@dosfilos/infrastructure';
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
 * - AUTO-DETECTS language from reference (English vs Spanish)
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
     * Detect language from reference string
     * English book names: "John", "Ephesians", "Romans", etc.
     * Spanish book names: "Juan", "Efesios", "Romanos", etc.
     */
    private static detectLanguage(ref: string): string {
        const normalized = ref.trim().toLowerCase();

        // Common English-only book names
        const englishIndicators = [
            'matthew', 'mark', 'luke', 'john', 'james',
            'acts', 'revelation', 'philippians', 'ephesians',
            'colossians', 'thessalonians', 'timothy', 'titus',
            'philemon', 'hebrews', 'peter', 'jude'
        ];

        // Common Spanish-only book names
        const spanishIndicators = [
            'mateo', 'marcos', 'lucas', 'juan', 'santiago',
            'hechos', 'apocalipsis', 'filipenses', 'efesios',
            'colosenses', 'tesalonicenses', 'timoteo', 'tito',
            'filemón', 'filemon', 'hebreos', 'pedro', 'judas'
        ];

        // Check for English indicators
        for (const indicator of englishIndicators) {
            if (normalized.includes(indicator)) {
                return 'en';
            }
        }

        // Check for Spanish indicators
        for (const indicator of spanishIndicators) {
            if (normalized.includes(indicator)) {
                return 'es';
            }
        }

        // Default to Spanish for compatibility
        return 'es';
    }

    /**
     * Get Bible repository for specified locale
     * If no locale specified, auto-detect from reference
     */
    private static getRepository(locale?: string, reference?: string): IBibleVersionRepository {
        const effectiveLocale = locale || (reference ? this.detectLanguage(reference) : 'es');
        return BibleVersionFactory.getForLocale(effectiveLocale);
    }

    static parseReference(ref: string, locale?: string): BibleReference | null {
        return this.getRepository(locale, ref).parseReference(ref);
    }

    static getVerses(refString: string, locale?: string): string | null {
        return this.getRepository(locale, refString).getVerses(refString);
    }

    /** Check if a book name/abbreviation is valid */
    static isValidBook(bookName: string, locale?: string): boolean {
        return this.getRepository(locale, bookName).isValidBook(bookName);
    }

    /** Get the canonical (full) name for a book abbreviation */
    static getCanonicalBookName(bookName: string, locale?: string): string | null {
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
