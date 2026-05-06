import type { PassageReference } from '../../bible/canon/passage-reference';
import type { CanonicalVerseAnalysis } from '../entities/CanonicalVerseAnalysis';
import type { StyleGuideManifest } from '../entities/StyleGuideManifest';
import type { ComposerSourceMetadata } from './IAcademicComposer';

/**
 * Port for the conclusion composer — synthesizes the body's accepted
 * verse analyses into the paper's conclusion section.
 *
 * Academic methodology: the conclusion is written FROM the body's
 * findings, not from a pre-imagined plan. It restates the thesis
 * that the verse-by-verse analysis actually demonstrated, integrates
 * the main translation commitments and verse theses, and connects
 * them to the broader argument of the book/passage.
 *
 * It does NOT introduce new arguments. It does NOT cite new sources
 * beyond what the body engaged with. It does NOT expand the analytic
 * frame.
 *
 * Scope: this composer produces ONLY the conclusion section markdown
 * (typically 2-3 paragraphs). It does NOT produce the whole paper —
 * that's `IAcademicComposer`'s job.
 *
 * Style guide enforcement is mandatory and lives at two layers
 * (prompt + deterministic post-formatter), same architecture as
 * `IAcademicComposer`.
 */
export interface IConclusionComposer {
    composeConclusion(input: ComposeConclusionInput): Promise<ComposeConclusionOutput>;
}

export interface ComposeConclusionInput {
    /** Whole-paper passage range. */
    paperPassage: PassageReference;
    /** Output language. */
    language: 'es' | 'en';
    /**
     * Paper-level framing (assignment brief + chosen angle). Threaded
     * so the conclusion's restatement of the thesis aligns with the
     * paper's identity.
     */
    assignmentBrief: string | null;
    /**
     * Accepted verse analyses in canonical order. The conclusion
     * synthesizes from these — they are the body the conclusion is
     * concluding ABOUT.
     */
    verseAnalyses: ReadonlyArray<CanonicalVerseAnalysis>;
    /** Style guide content (verbatim). */
    styleGuideContent: string;
    /** Structured style-guide manifest. Drives the post-formatter. */
    styleGuideManifest: StyleGuideManifest | null;
    /** Source registry — for citation lookup if the conclusion cites sparingly. */
    sources: ReadonlyArray<ComposerSourceMetadata>;
    /**
     * Optional regeneration hint provided by the user when re-running
     * the composer (e.g. "más énfasis en la cristología", "menos
     * referencia a contexto histórico").
     */
    regenerationHint: string | null;
}

export interface ComposeConclusionOutput {
    /**
     * Composed conclusion markdown (typically 2-3 paragraphs).
     * Suitable as the value of an `ExegeticalStepVersion.markdown`
     * for the conclusion-kind step.
     */
    markdown: string;
    /** Model id that produced this composition. */
    modelId: string;
    /** Token usage. Null when not reported. */
    tokensUsed: number | null;
    /**
     * Whether the deterministic style formatter ran. Same semantics
     * as `IAcademicComposer`: 'applied' / 'skipped' / 'error'. The
     * adapter itself returns 'skipped' — the use case may upgrade to
     * 'applied' / 'error' depending on whether and how the formatter
     * runs.
     */
    formatterStatus: 'applied' | 'skipped' | 'error';
}
