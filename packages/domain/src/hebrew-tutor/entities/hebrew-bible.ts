/**
 * Hebrew Bible navigation entities.
 *
 * These model the structural hierarchy of the Hebrew Bible as provided
 * by the morphhb dataset: Book → Chapter → Verse.
 * The text (hebrewText) comes from morphhb; the morphological analysis
 * does NOT come from morphhb.
 */

// ── Book ──────────────────────────────────────────────────────────────────────

/** Section grouping for the Hebrew Bible canon. */
export enum BibleSection {
  TORAH = 'TORAH',               // Pentateuch
  FORMER_PROPHETS = 'FORMER_PROPHETS',
  LATTER_PROPHETS = 'LATTER_PROPHETS',
  WRITINGS = 'WRITINGS',
}

/**
 * A book of the Hebrew Bible with its navigation metadata.
 * The `morphhbKey` is the key used to access the morphhb dataset.
 */
export interface HebrewBook {
  /** Key used internally by the morphhb npm package, e.g. "Gen", "Jonah" */
  readonly morphhbKey: string;
  /** Short standard abbreviation, e.g. "Gén", "Jon" */
  readonly abbreviation: string;
  readonly nameSpanish: string;
  readonly nameEnglish: string;
  /** Hebrew name as used in the Masoretic Text, e.g. "בְּרֵאשִׁית" */
  readonly nameHebrew: string;
  readonly section: BibleSection;
  readonly chapterCount: number;
  /** Display order within the canon */
  readonly canonicalOrder: number;
}

// ── Chapter / Verse ───────────────────────────────────────────────────────────

/** A verse from the Hebrew Bible with its raw text for analysis. */
export interface HebrewVerse {
  /** Full reference string, e.g. "Jonah.2.3" (morphhb format) */
  readonly reference: string;
  /** Human-readable reference, e.g. "Jonás 2:3" */
  readonly displayReference: string;
  /** Fully vocalized Hebrew text of the verse from the WLC via morphhb */
  readonly hebrewText: string;
  /**
   * Individual Hebrew word-tokens as they appear in morphhb.
   * Includes prefixed particles as part of their host word.
   */
  readonly words: readonly HebrewWordToken[];
}

/** A single word token from the morphhb dataset (used only for text display). */
export interface HebrewWordToken {
  /** The Hebrew text, possibly including prefixed particles, e.g. "וַ/יְהִ֧י" */
  readonly text: string;
  /**
   * Strong's lemma, e.g. "c/H1961".
   * This is informational only; not used as morphological authority.
   */
  readonly lemma: string;
  /**
   * OSHB morphological code from morphhb, e.g. "HC/Vqw3ms".
   * Kept for cross-validation display in the UI.
   */
  readonly oshbMorphCode: string;
}

/** Navigation index for a single book: verse counts per chapter. */
export interface BookIndex {
  readonly bookKey: string;
  /** verse counts by chapter (1-indexed, index 0 = chapter 1) */
  readonly versesPerChapter: readonly number[];
}
