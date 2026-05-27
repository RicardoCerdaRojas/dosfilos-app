import { LexiconEntry, WordStudyLanguage } from '@dosfilos/domain';
import curatedDataset from '../data/lexicon-curated-v1.json';

interface RawCuratedEntry {
    lemma: string;
    language: 'greek' | 'hebrew';
    transliteration: string;
    primaryGloss: string;
    semanticRange: string[];
    theologicalNote?: string;
}

interface CuratedDataset {
    version: string;
    license: string;
    attribution: string;
    guidelines: string;
    entries: RawCuratedEntry[];
}

/**
 * Pastoral Fidelity Phase 1.5 — primary lexicon source. Reads from
 * `data/lexicon-curated-v1.json` (~50 entries v1; expansion guided by
 * telemetry per ADR-017).
 *
 * Lookup is O(1) via lazy-built map keyed by `${language}:${lemma}`. The
 * adapter exposes `version` so cache invalidation upstream can include
 * `curatedVersion` in the key.
 */
export class CuratedGlossLexiconAdapter {
    private readonly dataset: CuratedDataset;
    private readonly index: Map<string, RawCuratedEntry>;

    constructor() {
        this.dataset = curatedDataset as CuratedDataset;
        this.index = new Map();
        for (const entry of this.dataset.entries) {
            this.index.set(`${entry.language}:${entry.lemma}`, entry);
        }
    }

    get version(): string {
        return this.dataset.version;
    }

    /**
     * Returns the set of curated lemmas for one language. Used by
     * `IdentifyKeyWordsUseCase` to apply the post-LLM boost (ADR-018).
     */
    lemmaSet(language: WordStudyLanguage): Set<string> {
        const set = new Set<string>();
        for (const entry of this.dataset.entries) {
            if (entry.language === language) set.add(entry.lemma);
        }
        return set;
    }

    lookup(lemma: string, language: WordStudyLanguage): LexiconEntry | null {
        const raw = this.index.get(`${language}:${lemma}`);
        if (!raw) return null;
        return {
            lemma: raw.lemma,
            language: raw.language,
            transliteration: raw.transliteration,
            primaryGloss: raw.primaryGloss,
            semanticRange: raw.semanticRange,
            theologicalNote: raw.theologicalNote,
            source: 'curated',
            attribution: this.dataset.attribution,
        };
    }
}
