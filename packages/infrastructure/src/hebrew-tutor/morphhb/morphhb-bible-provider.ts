/**
 * MorphhbBibleProvider
 *
 * Implements IHebrewBibleProvider using the Open Scriptures Hebrew Bible (morphhb) dataset.
 * The XML files are fetched from the GitHub raw content URL as a CDN.
 *
 * IMPORTANT: This provider supplies ONLY the Hebrew text and navigational structure.
 * It does NOT supply morphological analysis — that comes from Gemini + Farfán.
 *
 * Caching strategy: parsed books are cached in-memory per process lifetime.
 *
 * morphhb XML format (OSIS):
 *   <verse osisID="Jonah.2.3">
 *     <w lemma="c/H559" morph="HC/Vqw3ms">וַ/יֹּ֣אמֶר</w>
 *     ...
 *   </verse>
 */

import type {
  IHebrewBibleProvider,
  HebrewBook,
  HebrewVerse,
  HebrewWordToken,
  BookIndex,
  BibleSection,
} from '@dosfilos/domain';
import { HEBREW_BOOKS_CATALOG } from './books-catalog.js';

type ParsedBook = {
  verses: Map<string, { hebrewText: string; words: HebrewWordToken[] }>;
  versesPerChapter: number[];
};

/** Base URL to access the morphhb WLC XML files. */
const MORPHHB_BASE_URL =
  'https://raw.githubusercontent.com/openscriptures/morphhb/master/wlc';

/**
 * Parses a morphhb OSIS XML string into a structured map of verseId → tokens.
 */
function parseMorphhbXml(xmlText: string): ParsedBook {
  // Simple regex-based parser (avoids a full XML DOM parser dependency)
  const verseMap = new Map<string, { hebrewText: string; words: HebrewWordToken[] }>();
  const versesPerChapter: number[] = [];

  // Match each <verse> block
  const verseRegex = /<verse\s+osisID="([^"]+)">([\s\S]*?)<\/verse>/g;
  let verseMatch: RegExpExecArray | null;

  while ((verseMatch = verseRegex.exec(xmlText)) !== null) {
    const [, osisId, verseContent] = verseMatch;
    const parts = osisId.split('.');
    const chapter = parseInt(parts[1] ?? '0', 10);

    // Collect word tokens from <w> elements
    const words: HebrewWordToken[] = [];
    const wRegex = /<w\s+([^>]*)>([\s\S]*?)<\/w>/g;
    let wMatch: RegExpExecArray | null;

    while ((wMatch = wRegex.exec(verseContent)) !== null) {
      const [, attrs, rawText] = wMatch;
      const lemma = extractAttr(attrs, 'lemma');
      const morph = extractAttr(attrs, 'morph');
      // Remove OSIS markup from the text (ketiv/qere etc.), slashes, and normalize spaces
      const text = rawText.replace(/<[^>]+>/g, '').replace(/\//g, '').replace(/\s+/g, ' ').trim();

      if (text) {
        words.push({ text, lemma, oshbMorphCode: morph });
      }
    }

    const hebrewText = words.map((w) => w.text).join(' ');
    verseMap.set(osisId, { hebrewText, words });

    // Track max verse per chapter
    const verse = parseInt(parts[2] ?? '0', 10);
    if (!versesPerChapter[chapter - 1] || versesPerChapter[chapter - 1] < verse) {
      versesPerChapter[chapter - 1] = verse;
    }
  }

  return { verses: verseMap, versesPerChapter };
}

function extractAttr(attrs: string, name: string): string {
  const match = new RegExp(`${name}="([^"]*)"`, 'i').exec(attrs);
  return match ? match[1] : '';
}

// ── Provider ──────────────────────────────────────────────────────────────────

export class MorphhbBibleProvider implements IHebrewBibleProvider {
  private readonly cache = new Map<string, ParsedBook>();

  getBooks(): HebrewBook[] {
    return HEBREW_BOOKS_CATALOG;
  }

  getBookIndex(morphhbKey: string): BookIndex {
    const book = this.getCachedBook(morphhbKey);
    if (!book) {
      throw new Error(
        `Book "${morphhbKey}" not loaded. Call a method that triggers loading first.`,
      );
    }
    return { bookKey: morphhbKey, versesPerChapter: book.versesPerChapter };
  }

  getChapterCount(morphhbKey: string): number {
    const bookMeta = HEBREW_BOOKS_CATALOG.find((b) => b.morphhbKey === morphhbKey);
    return bookMeta?.chapterCount ?? 0;
  }

  getVerseCount(morphhbKey: string, chapter: number): number {
    const book = this.getCachedBook(morphhbKey);
    return book?.versesPerChapter[chapter - 1] ?? 0;
  }

  getVerse(morphhbKey: string, chapter: number, verse: number): HebrewVerse {
    const book = this.getCachedBook(morphhbKey);
    const osisId = `${morphhbKey}.${chapter}.${verse}`;

    if (!book) {
      throw new Error(`Book "${morphhbKey}" not loaded. Call loadBook() first.`);
    }

    const data = book.verses.get(osisId);
    if (!data) {
      throw new Error(`Verse ${osisId} not found in the morphhb dataset.`);
    }

    const bookMeta = HEBREW_BOOKS_CATALOG.find((b) => b.morphhbKey === morphhbKey);
    const displayReference = `${bookMeta?.nameSpanish ?? morphhbKey} ${chapter}:${verse}`;

    return {
      reference: osisId,
      displayReference,
      hebrewText: data.hebrewText,
      words: data.words,
    };
  }

  /**
   * Loads and parses a book from morphhb into the in-memory cache.
   * Must be called before getVerse() / getVerseCount() for a book.
   */
  async loadBook(morphhbKey: string): Promise<void> {
    if (this.cache.has(morphhbKey)) return;

    const url = `${MORPHHB_BASE_URL}/${morphhbKey}.xml`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Failed to load morphhb data for "${morphhbKey}": HTTP ${response.status}`,
      );
    }
    const xmlText = await response.text();
    const parsed = parseMorphhbXml(xmlText);
    this.cache.set(morphhbKey, parsed);
  }

  private getCachedBook(morphhbKey: string): ParsedBook | undefined {
    return this.cache.get(morphhbKey);
  }
}
