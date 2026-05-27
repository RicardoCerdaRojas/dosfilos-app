import type {
    IPastoralWordAnalysisCacheRepository,
    IPastoralWordStudyService,
    LexiconEntry,
    PastoralWordAnalysis,
    PastoralWordAnalysisDoc,
    WordStudyLanguage,
} from '@dosfilos/domain';
import { buildPastoralWordAnalysisCacheKey } from '@dosfilos/domain';

export interface AnalyzeWordPastorallyArgs {
    word: string;
    lemma: string;
    verseRef: string;
    passage: string;
    /** Deterministic short hash of the passage — produced upstream. */
    passageHash: string;
    language: WordStudyLanguage;
    lexicon: LexiconEntry;
    crossRefs: Array<{ reference: string; topic?: string; strength?: number }>;
    curatedVersion: string;
}

export interface AnalyzeWordPastorallyResult {
    analysis: PastoralWordAnalysis;
    cacheHit: boolean;
}

/**
 * Pastoral Fidelity Phase 1.5 — orchestrates the cache → LLM → cache
 * flow for the pastoral analysis of one word. Cache key includes the
 * curated dataset version so bumps invalidate stale entries.
 */
export class AnalyzeWordPastorallyUseCase {
    constructor(
        private readonly service: IPastoralWordStudyService,
        private readonly cache: IPastoralWordAnalysisCacheRepository,
    ) {}

    async execute(args: AnalyzeWordPastorallyArgs): Promise<AnalyzeWordPastorallyResult> {
        const cacheKey = {
            language: args.language,
            lemma: args.lemma,
            passageHash: args.passageHash,
            curatedVersion: args.curatedVersion,
        };

        const cached = await this.cache.findByKey(cacheKey);
        if (cached) {
            return { analysis: cached.analysis, cacheHit: true };
        }

        const analysis = await this.service.analyzeWord({
            word: args.word,
            lemma: args.lemma,
            verseRef: args.verseRef,
            passage: args.passage,
            language: args.language,
            lexicon: args.lexicon,
            crossRefs: args.crossRefs,
        });

        const now = new Date();
        const doc: PastoralWordAnalysisDoc = {
            id: buildPastoralWordAnalysisCacheKey(cacheKey),
            language: args.language,
            lemma: args.lemma,
            passageHash: args.passageHash,
            curatedVersion: args.curatedVersion,
            verseRef: args.verseRef,
            analysis,
            createdAt: now,
            updatedAt: now,
        };

        // Best-effort cache write — failures must not block the pastor.
        try {
            await this.cache.save(doc);
        } catch (err) {
            console.error('[AnalyzeWordPastorallyUseCase] cache save failed', err);
        }

        return { analysis, cacheHit: false };
    }
}
