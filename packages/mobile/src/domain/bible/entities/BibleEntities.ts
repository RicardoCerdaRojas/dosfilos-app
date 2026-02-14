/**
 * Biblical text entities - Domain layer
 * Shared across all Bible-related features
 */

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

export interface BibleBook {
    id: string;
    name: string;
    chaptersCount: number;
}
