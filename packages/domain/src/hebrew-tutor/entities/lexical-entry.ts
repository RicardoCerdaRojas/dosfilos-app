/**
 * LexicalEntry — domain entity for the administrable Hebrew lexical glossary.
 *
 * Entries are curated by the SuperAdmin and stored in Firestore at
 * `hebrewTutor/config/lexicon/{id}`. At analysis time, matching entries
 * are injected into the Gemini prompt to guide idiomatic translation.
 *
 * Architectural note:
 *  - The domain defines only the shape (LexicalEntry, LexicalEntryType).
 *  - Matching logic lives in the application layer (AnalyzeVerseUseCase).
 *  - Persistence (Firestore CRUD) lives in the infrastructure layer.
 *  - Admin UI lives in the presentation layer (LexiconCatalogPage).
 */

/**
 * Classifies the nature of a lexical observation.
 * Drives display badges and filtering in the admin UI.
 */
export type LexicalEntryType =
  | 'idiom'          // Fixed expression: חַיַּת הַשָּׂדֶה → "animales salvajes"
  | 'semantic_range' // Word with broader/narrower range than the literal: נֶפֶשׁ
  | 'cultural_note'  // Requires cultural context to translate faithfully
  | 'false_friend';  // Literal translation actively misleads modern readers

/**
 * A single entry in the lexical glossary.
 *
 * Persistence: stored in Firestore at `hebrewTutor/config/lexicon/{id}`.
 * The glossary starts empty; entries are added by SuperAdmin over time.
 */
export interface LexicalEntry {
  /** Stable unique identifier (Firestore doc ID). */
  readonly id: string;

  // ── Matching ──────────────────────────────────────────────────────────────

  /**
   * Primary Hebrew phrase for display, e.g. "חַיַּת הַשָּׂדֶה".
   * Used in the prompt injection and the admin UI.
   */
  readonly hebrewPhrase: string;

  /**
   * Individual Hebrew lemmas used for flexible matching against the verse words.
   * A verse that contains ANY of these lemmas triggers inclusion of this entry.
   * Example: ["חַי", "שָׂדֶה"] for the idiom חַיַּת הַשָּׂדֶה.
   */
  readonly matchLemmas: readonly string[];

  // ── Content ───────────────────────────────────────────────────────────────

  readonly type: LexicalEntryType;

  /** Word-for-word meaning, e.g. "criatura viviente del campo" */
  readonly literalMeaning: string;

  /** Dynamic-equivalent meaning, e.g. "animales salvajes" */
  readonly idiomaticMeaning: string;

  /** Academic explanation of the semantic difference, suitable for seminary level */
  readonly explanation: string;

  /**
   * Optional scholarly source reference, e.g. "HALOT 310" or "BDB 961".
   * Stored for traceability; not injected in the prompt.
   */
  readonly source?: string;

  // ── Control ───────────────────────────────────────────────────────────────

  /** Whether the entry participates in prompt injection. Admins can disable without deleting. */
  readonly enabled: boolean;

  /** Display order in the admin catalog. Lower = earlier. */
  readonly order: number;

  /** ISO timestamp of creation */
  readonly createdAt: string;

  /** ISO timestamp of last update */
  readonly updatedAt: string;
}
