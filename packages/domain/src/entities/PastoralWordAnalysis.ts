/**
 * Pastoral Fidelity Phase 1.5 — Pastoral Word Study domain entities.
 *
 * These types model the LLM-assisted analysis surface that replaces the
 * `GreekTutorOverlay` embed inside `MorphologyStep`. They are deliberately
 * focused on the pastor preparing a sermon — not on a student learning
 * Greek/Hebrew. See ADR-016 for the architectural separation and ADRs
 * 017-021 for the design decisions implemented here.
 */

/** Lexicon adapter that produced a given lookup. */
export type LexiconSource = 'curated' | 'lsj' | 'bdb';

/** Language scope of a word study (mirrors `WordStudy.language`). */
export type WordStudyLanguage = 'greek' | 'hebrew';

/**
 * Candidate key word surfaced by `IdentifyKeyWordsUseCase`. The LLM
 * ranks 5-8 of these for any given pericope; the catálogo curated may
 * boost the `theologicalWeight` of lemmas that already have a curated
 * entry (ADR-018).
 */
export interface KeyWordCandidate {
    /** Original-language form as it appears in the verse (with diacritics). */
    word: string;
    /** Latin-script transliteration. */
    transliteration: string;
    /**
     * Short literal translation/gloss (1-3 words, Spanish) for quick scanning
     * in the candidate list. Optional — results from before this field shipped
     * omit it, so the UI renders it only when present.
     */
    gloss?: string;
    /** Lemma / dictionary form. */
    lemma: string;
    /** Where the word appears (e.g. "Rom 8:4"). */
    verseRef: string;
    /**
     * 0-10 score. Higher = more theologically loaded for the pasaje.
     * Post-LLM boost (+2 default) applies when `lemma` exists in the
     * curated dataset.
     */
    theologicalWeight: number;
    /** Short LLM rationale for the ranking. */
    rationale: string;
    /** True when curated boost was applied. */
    curatedBoostApplied?: boolean;
}

/** Canonical resonance for a word — 2-3 surfaced per analysis. */
export interface WordResonance {
    /** Bible reference of the parallel (e.g. "Gal 5:1"). */
    reference: string;
    /** LLM-generated pastoral note on the relationship (NOT extracted from the engine). */
    howRelated: string;
}

/** Full pastoral analysis of a single word. */
export interface PastoralWordAnalysis {
    word: {
        original: string;
        transliteration: string;
        lemma: string;
    };
    gloss: {
        /** Primary pastoral gloss (preferring curated v1 when available). */
        primary: string;
        /** 3-5 senses, ordered by relevance to the verse. */
        semanticRange: string[];
    };
    /** Grammatical function IN THIS VERSE — not a paradigm. */
    grammaticalFunctionInVerse: string;
    /** 2-3 canonical resonances chosen by the LLM from the cross-ref engine. */
    resonances: WordResonance[];
    /** 2-3 sentences on WHY this word carries weight in the verse. */
    theologicalWeight: string;
    /** Lexicon source used as primary input (for attribution). */
    lexiconSource: LexiconSource;
    /** Optional language tag (mirrors the study). */
    language: WordStudyLanguage;
}

/**
 * Cache key components for `pastoralWordAnalyses/` collection.
 * Persisted analyses are stable across users for the same key.
 * `curatedVersion` invalidates cache when the curated dataset bumps.
 */
export interface PastoralWordAnalysisCacheKey {
    language: WordStudyLanguage;
    lemma: string;
    passageHash: string;
    curatedVersion: string;
}

/**
 * Cached document persisted in `pastoralWordAnalyses/`. Doc id is the
 * deterministic string `${language}__${lemma}__${passageHash}__${curatedVersion}`.
 */
export interface PastoralWordAnalysisDoc {
    id: string;
    language: WordStudyLanguage;
    lemma: string;
    passageHash: string;
    curatedVersion: string;
    /** Verse reference the analysis is anchored to (for display, not for keying). */
    verseRef: string;
    analysis: PastoralWordAnalysis;
    createdAt: Date;
    updatedAt: Date;
}

/** Lexicon entry returned by `CompositeLexicon.lookup`. */
export interface LexiconEntry {
    lemma: string;
    language: WordStudyLanguage;
    transliteration: string;
    primaryGloss: string;
    /** 1-5 senses, ordered. */
    semanticRange: string[];
    /** Optional pastoral note (only curated v1 carries this). */
    theologicalNote?: string;
    /** Adapter that produced this entry. */
    source: LexiconSource;
    /** Required attribution snippet for the source (citation engine consumes). */
    attribution: string;
}
