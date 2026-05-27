import { LexiconEntry, WordStudyLanguage } from '@dosfilos/domain';

/**
 * Pastoral Fidelity Phase 1.5 — BDB fallback adapter for Hebrew lemmas
 * outside the curated v1 set.
 *
 * Ships as a graceful stub — see the LSJ adapter docblock for the same
 * rationale and follow-up tracking.
 */
export class BdbLexiconAdapter {
    lookup(_lemma: string, language: WordStudyLanguage): LexiconEntry | null {
        if (language !== 'hebrew') return null;
        return null;
    }

    get attribution(): string {
        return 'Brown-Driver-Briggs Hebrew-English Lexicon (public domain).';
    }
}
