import { LexiconEntry, WordStudyLanguage } from '@dosfilos/domain';
import { CuratedGlossLexiconAdapter } from './CuratedGlossLexiconAdapter';
import { LsjLexiconAdapter } from './LsjLexiconAdapter';
import { BdbLexiconAdapter } from './BdbLexiconAdapter';

/**
 * Pastoral Fidelity Phase 1.5 — composite lookup over curated + LSJ + BDB.
 * Tries curated first; falls through to LSJ (greek) or BDB (hebrew)
 * when curated misses. When all sources return `null`, callers fall
 * back to an empty placeholder so the LLM can still produce analysis
 * from passage context alone.
 */
export class CompositeLexicon {
    constructor(
        private readonly curated: CuratedGlossLexiconAdapter = new CuratedGlossLexiconAdapter(),
        private readonly lsj: LsjLexiconAdapter = new LsjLexiconAdapter(),
        private readonly bdb: BdbLexiconAdapter = new BdbLexiconAdapter(),
    ) {}

    get curatedVersion(): string {
        return this.curated.version;
    }

    hasCurated(lemma: string, language: WordStudyLanguage): boolean {
        return this.curated.lookup(lemma, language) !== null;
    }

    curatedLemmaSet(language: WordStudyLanguage): Set<string> {
        return this.curated.lemmaSet(language);
    }

    lookup(lemma: string, language: WordStudyLanguage): LexiconEntry | null {
        const curatedHit = this.curated.lookup(lemma, language);
        if (curatedHit) return curatedHit;

        const fallback = language === 'greek' ? this.lsj.lookup(lemma, language) : this.bdb.lookup(lemma, language);
        return fallback;
    }

    /**
     * Convenience: returns a sentinel entry when no source carries the
     * lemma. Callers can pass this to the LLM so the prompt still has
     * something to anchor (verse context + cross-refs do the heavy
     * lifting). `source` set to `'lsj' | 'bdb'` to record which fallback
     * was *attempted*, even if it returned null.
     */
    lookupOrSentinel(lemma: string, language: WordStudyLanguage, transliteration: string): LexiconEntry {
        const hit = this.lookup(lemma, language);
        if (hit) return hit;
        return {
            lemma,
            language,
            transliteration,
            primaryGloss: '',
            semanticRange: [],
            source: language === 'greek' ? 'lsj' : 'bdb',
            attribution: language === 'greek' ? this.lsj.attribution : this.bdb.attribution,
        };
    }
}
