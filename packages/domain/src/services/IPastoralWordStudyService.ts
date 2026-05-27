import type {
    KeyWordCandidate,
    PastoralWordAnalysis,
    WordStudyLanguage,
    LexiconEntry,
} from '../entities/PastoralWordAnalysis';

/**
 * Pastoral Fidelity Phase 1.5 — port for the LLM-assisted Pastoral Word
 * Study service. Implementations live in `packages/infrastructure/src/gemini/`
 * (production) or in the test suite (mocked). The application use cases
 * depend on this port; they never touch Gemini SDK types directly.
 */
export interface IPastoralWordStudyService {
    /**
     * Step 1 of the modal flow: identify 5-8 theologically loaded words
     * from the original-language text of the passage. Implementations
     * may apply post-LLM curated boost (ADR-018) — boost is metadata on
     * each candidate so the UI can show the source if needed.
     */
    identifyKeyWords(args: {
        passage: string;
        language: WordStudyLanguage;
        originalText?: string;
        translationName?: string;
    }): Promise<KeyWordCandidate[]>;

    /**
     * Step 2 of the modal flow: produce a pastoral analysis for one
     * word. Receives lexicon + cross-references as context; returns
     * structured analysis (gloss, grammatical function in verse,
     * resonances, theological weight).
     *
     * Caller is responsible for caching (transversal Firestore cache
     * keyed by `language + lemma + passageHash + curatedVersion`). The
     * service is stateless.
     */
    analyzeWord(args: {
        word: string;
        lemma: string;
        verseRef: string;
        passage: string;
        language: WordStudyLanguage;
        lexicon: LexiconEntry;
        crossRefs: Array<{ reference: string; topic?: string; strength?: number }>;
    }): Promise<PastoralWordAnalysis>;
}
