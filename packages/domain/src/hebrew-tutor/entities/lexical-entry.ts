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
  | 'idiom'            // Fixed expression: חַיַּת הַשָּׂדֶה → "animales salvajes"
  | 'semantic_range'   // Word with broader/narrower range than the literal: נֶפֶשׁ
  | 'cultural_note'    // Requires cultural context to translate faithfully
  | 'false_friend'     // Literal translation actively misleads modern readers
  | 'grammatical_note';// Exegetically significant syntactic/morphological phenomenon
                       // (e.g. emphatic independent pronoun, infinitive absolute,
                       //  casus pendens). Distinct from universal hardcoded grammar
                       // rules: this type captures curated, instance-specific
                       // observations with interpretive weight.


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
   * Optional list of OSIS verse reference IDs (e.g. ["Gen.3.8", "Ps.23.1"]).
   *
   * When provided, the entry is injected whenever the current verse matches ANY
   * of these references — REGARDLESS of whether any `matchLemmas` are present.
   * This is the simplest way to create verse-specific exegetical notes without
   * needing to know the Strong's number for the relevant word.
   *
   * Example: ["Gen.3.8"] pins a קוֹל entry exclusively to Genesis 3:8,
   * avoiding false matches in other verses where קוֹל genuinely means "voice".
   *
   * When absent (or empty), matching falls back to `matchLemmas` only.
   */
  readonly verseRefs?: readonly string[];

  /**
   * Optional chain identifier for grouping related entries into a Leitwort
   * (semantic thread) that spans multiple verses within a pericope.
   *
   * When ANY entry in a chain matches the current verse (via verseRefs or
   * matchLemmas), ALL entries sharing the same chainId are injected into the
   * prompt. This gives the LLM full discourse context to maintain translation
   * coherence across verses.
   *
   * Convention: use descriptive kebab-case IDs, e.g. "qol-gen3" for the
   * קוֹל thread in Genesis 3:8–10.
   */
  readonly chainId?: string;

  /**
   * Individual Hebrew lemmas / Strong's numbers used for broad matching.
   * A verse that contains ANY of these lemmas triggers inclusion of this entry.
   * Example: ["6963 a", "6963"] for קוֹל (Strong's H6963).
   *
   * For verse-specific corrections, prefer `verseRefs` over this field to avoid
   * false positives in other passages.
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
