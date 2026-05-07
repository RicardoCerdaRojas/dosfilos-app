import type { VerifiedCitation } from '../entities/CitationVerification';

/**
 * Source surface a verifier needs to match a citation against. Slim by
 * design — just enough to identify the source (lookup) and to inspect
 * its content (verification). Adapters in infrastructure project from
 * the richer `ProjectSource` + corpus content into this shape.
 */
export interface VerifierSource {
    corpusId: string;
    /** Short surname/key used in citations. Null when the user never set one. */
    citationKey: string | null;
    /** Full author / publisher line — used for surname extraction fallback. */
    fullAuthor: string | null;
    /** Display label used as title fallback. */
    displayLabel: string;
    /**
     * One verifiable chunk of source text. For `mode: 'extracted-excerpts'`
     * sources, one entry per excerpt with the excerpt's `sourceLocation`
     * as `pageHint`. For `mode: 'full-document'` sources, a single entry
     * with the whole text and a null `pageHint` (page-mismatch detection
     * is skipped for these).
     */
    chunks: ReadonlyArray<VerifierSourceChunk>;
}

export interface VerifierSourceChunk {
    text: string;
    /** "p. 47" or "comm. on v.1" — null when the source is full-document. */
    pageHint: string | null;
}

export interface CitationVerifierInput {
    /** The accepted/current step version's markdown. */
    markdown: string;
    /** All citable sources attached to the paper. */
    sources: ReadonlyArray<VerifierSource>;
}

export interface CitationVerifierOutput {
    citations: VerifiedCitation[];
}

/**
 * Programmatic citation verifier. Pure function in shape — given the
 * markdown and the paper's source material, returns one verdict per
 * detected citation. No side effects.
 *
 * The use case persists the resulting summary on the step version's
 * `verifications` field; the per-citation list is returned to the UI
 * for the verification dialog.
 */
export interface ICitationVerifier {
    verify(input: CitationVerifierInput): CitationVerifierOutput;
}
