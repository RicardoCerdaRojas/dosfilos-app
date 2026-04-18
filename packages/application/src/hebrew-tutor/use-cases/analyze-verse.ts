/**
 * AnalyzeVerseUseCase
 *
 * Application use case: Orchestrates fetching a Hebrew verse from the Bible
 * provider and running the morphological analysis service on it.
 *
 * Responsibilities:
 *  1. Load the book data if not already cached
 *  2. Retrieve the verse Hebrew text
 *  3. Delegate analysis to IHebrewAnalysisService (Gemini)
 *  4. Check cache before calling the API (via IHebrewSessionRepository)
 *  5. [NEW] Fetch and match lexical entries from ILexicalRepository (Level 2 RAG)
 *  6. Return a VerseAnalysis aggregate
 *
 * This use case does NOT contain grammar logic — that lives in the
 * infrastructure (GeminiHebrewService + knowledge chunks).
 */

import type {
  IHebrewBibleProvider,
  IHebrewAnalysisService,
  IHebrewSessionRepository,
  ILexicalRepository,
  VerseAnalysis,
  LexicalEntry,
} from '@dosfilos/domain';
import { reconcileGlobalWords } from '@dosfilos/infrastructure';

export interface AnalyzeVerseInput {
  /** Book key as used by morphhb, e.g. "Jonah" */
  readonly morphhbKey: string;
  /** 1-indexed chapter number */
  readonly chapter: number;
  /** 1-indexed verse number */
  readonly verse: number;
  /** Response language — default 'es' */
  readonly language?: string;
  /** If true, bypass cache and re-analyze */
  readonly forceRefresh?: boolean;
}

export class AnalyzeVerseUseCase {
  constructor(
    private readonly bibleProvider: IHebrewBibleProvider & {
      loadBook(key: string): Promise<void>;
    },
    private readonly analysisService: IHebrewAnalysisService,
    private readonly sessionRepository?: IHebrewSessionRepository,
    private readonly lexicalRepository?: ILexicalRepository,
  ) {}

  async execute(input: AnalyzeVerseInput): Promise<VerseAnalysis> {
    const { morphhbKey, chapter, verse, language = 'es', forceRefresh = false } = input;

    // 1. Ensure the book is loaded in the provider cache
    await this.bibleProvider.loadBook(morphhbKey);

    // 2. Retrieve the verse with Hebrew text and OSHB tokens
    const hebrewVerse = this.bibleProvider.getVerse(morphhbKey, chapter, verse);

    // 3. Check analysis cache (avoid redundant API calls)
    if (!forceRefresh && this.sessionRepository) {
      const cached = await this.sessionRepository.getCachedAnalysis(hebrewVerse.reference);
      if (cached) {
        // Retroactively reconcile cached words with authoritative morphhb tokens
        // to restore cantillation marks (te'amim) for legacy cached entries
        const reconciledWords = reconcileGlobalWords(cached.words, hebrewVerse.words);
        
        return {
          ...cached,
          hebrewText: hebrewVerse.hebrewText,
          words: reconciledWords,
        };
      }
    }

    // 4. Fetch and match lexical entries for Level 2 RAG injection
    const lexicalEntries = await this.resolveMatchingLexicalEntries(hebrewVerse.words);

    // 5. Perform the analysis via Gemini + knowledge base + lexical context
    const analysis = await this.analysisService.analyzeVerse(hebrewVerse, language, lexicalEntries);

    // 6. Persist to cache for future requests
    if (this.sessionRepository) {
      await this.sessionRepository.cacheAnalysis(hebrewVerse.reference, analysis);
    }

    return analysis;
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  /**
   * Fetches all enabled lexical entries and returns the subset that matches
   * at least one lemma from the verse words.
   *
   * Matching strategy: an entry matches if ANY of its `matchLemmas` appears
   * in ANY of the verse word lemmas (case-insensitive string equality).
   * This is intentionally simple and broad — false positives are rare because
   * Hebrew lemmas are specific, and the LLM will ignore irrelevant entries.
   *
   * @param verseWords - Tokenized words of the verse from morphhb
   * @returns The filtered, deduplicated list of matching LexicalEntry objects
   */
  private async resolveMatchingLexicalEntries(
    verseWords: readonly { lemma?: string }[],
  ): Promise<readonly LexicalEntry[]> {
    if (!this.lexicalRepository) return [];

    let allEntries: readonly LexicalEntry[];
    try {
      allEntries = await this.lexicalRepository.getAll();
    } catch {
      // Lexical repository failure should not block verse analysis
      console.warn('AnalyzeVerseUseCase: lexicalRepository.getAll() failed — continuing without lexical context.');
      return [];
    }

    if (allEntries.length === 0) return [];

    const verseLemmas = new Set(
      verseWords
        .map((w) => w.lemma?.trim().toLowerCase())
        .filter((l): l is string => !!l),
    );

    return allEntries.filter((entry) =>
      entry.matchLemmas.some((lemma) => verseLemmas.has(lemma.trim().toLowerCase())),
    );
  }
}
