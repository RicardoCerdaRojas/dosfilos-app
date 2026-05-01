import type { StyleGuideManifest } from '../entities/StyleGuideManifest';

/**
 * Deterministic post-processor that takes raw markdown produced by
 * the LLM and rewrites the mechanical pieces (footnote format, ibid
 * sequences, quote marks, ellipses) so they match the style guide's
 * structured rules.
 *
 * Rationale: the LLM is good at content but unreliable on
 * deterministic format. We can't trust it to remember "Lane was
 * already cited two paragraphs ago, so this should be the abbreviated
 * form" or "this paragraph quotes 47 words, so it should be a block
 * quote, not inline". The formatter handles the mechanical pass
 * after generation.
 *
 * Implementations live in infrastructure (likely a TypeScript module
 * with regex + small parsers — no LLM call needed). The use case
 * runs the formatter inline after every successful generation, BEFORE
 * the version is stored, so what the user sees is already correct.
 *
 * Idempotent: applying the formatter twice produces the same output
 * as applying it once. The use case relies on this so manual edits
 * → re-format → save doesn't drift.
 */
export interface IStyleFormatter {
    format(input: StyleFormatInput): StyleFormatOutput;
}

export interface StyleFormatInput {
    /** Raw markdown the LLM emitted (or the user edited). */
    markdown: string;
    /** Active style guide rules. */
    manifest: StyleGuideManifest;
    /**
     * The list of citable sources on the paper, with the metadata the
     * formatter needs to rewrite footnotes (full author names,
     * abbreviated keys, full title, short title, publisher info).
     * The use case assembles this from the paper's
     * `ProjectSource` array and the corpus metadata.
     */
    citableSources: ReadonlyArray<FormatterSourceMetadata>;
    /**
     * Footnote anchors that already appeared in the same paper
     * earlier (intro + accepted prior steps). Lets the formatter
     * decide first-vs-subsequent across step boundaries — without
     * this, every step thinks it's seeing a source for the first
     * time and emits the long form.
     */
    priorFootnoteAnchors: ReadonlyArray<PriorFootnoteAnchor>;
}

export interface FormatterSourceMetadata {
    /** Matches `ProjectSource.corpusId`. */
    corpusId: string;
    /** Short author key (`ProjectSource.citationKey` or derived). */
    citationKey: string;
    fullAuthor: string;
    /** Surname-first form for bibliography entries ("Lane, William L."). */
    authorSurnameFirst: string;
    fullTitle: string;
    shortTitle: string;
    publisher: string | null;
    city: string | null;
    year: number | null;
    volume: string | null;
}

export interface PriorFootnoteAnchor {
    /** Which source this footnote referred to. */
    corpusId: string;
    /**
     * The page (or page range) cited at that point. Lets the
     * formatter decide when ibid is appropriate (consecutive,
     * different page → "Ibid., 47") vs. fresh short form.
     */
    pages: string | null;
}

export interface StyleFormatOutput {
    /** Markdown after deterministic rewrites. */
    markdown: string;
    /** Per-source counts of how many footnotes referenced each source. Useful for analytics. */
    footnoteCounts: ReadonlyMap<string, number>;
    /**
     * Issues the formatter encountered (e.g. a citation pointing at a
     * corpusId not in `citableSources`). Surfaced to the user as a
     * warning chip, not a blocking error — the markdown still
     * contains the original citation, just unformatted.
     */
    warnings: ReadonlyArray<string>;
}
