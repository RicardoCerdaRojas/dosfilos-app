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
 *  5. Return a VerseAnalysis aggregate
 *
 * This use case does NOT contain grammar logic — that lives in the
 * infrastructure (GeminiHebrewService + knowledge chunks).
 */

import type {
  IHebrewBibleProvider,
  IHebrewAnalysisService,
  IHebrewSessionRepository,
  VerseAnalysis,
} from '@dosfilos/domain';

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
        return cached;
      }
    }

    // 4. Perform the analysis via Gemini + knowledge base
    const analysis = await this.analysisService.analyzeVerse(hebrewVerse, language);

    // 5. Persist to cache for future requests
    if (this.sessionRepository) {
      await this.sessionRepository.cacheAnalysis(hebrewVerse.reference, analysis);
    }

    return analysis;
  }
}
