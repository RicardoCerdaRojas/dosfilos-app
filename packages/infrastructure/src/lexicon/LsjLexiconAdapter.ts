import { LexiconEntry, WordStudyLanguage } from '@dosfilos/domain';

/**
 * Pastoral Fidelity Phase 1.5 — LSJ fallback adapter for Greek lemmas
 * outside the curated v1 set.
 *
 * v1 ships as a graceful stub: returns `null` for any lookup so the
 * `CompositeLexicon` falls through cleanly and the LLM proceeds with
 * passage + cross-refs but no lexicon entry. Replacement with a real
 * Perseus LSJ dump (~10-20 MB indexed by lemma) is tracked as
 * follow-up (`tech_debt_lsj_dataset` memory).
 *
 * Until then telemetry `lexicon_gap_greek` logs every curated miss to
 * guide both curated v1.1 expansion AND LSJ adapter wire-up priority.
 */
export class LsjLexiconAdapter {
    lookup(_lemma: string, language: WordStudyLanguage): LexiconEntry | null {
        if (language !== 'greek') return null;
        // Real dataset arrives post-launch. See ADR-017.
        return null;
    }

    get attribution(): string {
        return 'Liddell-Scott-Jones Greek-English Lexicon (Perseus Digital Library, public domain).';
    }
}
