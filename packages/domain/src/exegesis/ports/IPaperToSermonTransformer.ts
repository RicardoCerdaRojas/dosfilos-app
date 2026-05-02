import type { PassageReference } from '../../bible/canon/passage-reference';

/**
 * Port for the paper → sermon transformation step.
 *
 * Implementations live in infrastructure (Gemini Pro 2.5 with thinking
 * for v1). The use case in `application/` resolves the paper via the
 * repository and hands a fully-formed input to the transformer; the
 * transformer is dumb and only does "given this paper, produce a
 * sermon-ready markdown body in this tone".
 *
 * Why a dedicated port (and not a reuse of `IExegesisOrchestrator`):
 * the orchestrator is structured around step kinds (verse / conclusion /
 * introduction) and citation discipline. A sermon is a different output
 * shape — homiletical flow, oral cadence, no formal citations — so
 * sharing one prompt would force both directions to compromise. Keeping
 * them separate also lets us swap models / tones independently.
 *
 * The transformer does NOT persist the resulting sermon — that's the
 * use case's job (so the repository write stays in the application
 * layer where ownership and traceability checks live).
 */
export interface IPaperToSermonTransformer {
    transform(input: PaperToSermonInput): Promise<PaperToSermonOutput>;
}

export type PaperToSermonTone = 'pastoral' | 'expositivo' | 'narrativo';

export interface PaperToSermonInput {
    /** The whole-paper passage range (informs the title fallback and the homiletical anchor). */
    paperPassage: PassageReference;
    /** The paper's user-assigned title, if any — the LLM may keep, refine, or replace it. */
    paperTitle: string | null;
    /**
     * Free-text framing of the paper (assignment brief + author angle).
     * Injected verbatim so the sermon stays aligned with the paper's
     * narrative identity. Null when the student didn't supply one.
     */
    assignmentBrief: string | null;
    /** Final assembled paper markdown — the source material the sermon distills. */
    assembledMarkdown: string;
    /** Drives prompt selection and homiletical register. */
    tone: PaperToSermonTone;
    /** Output language; matches the paper's displayLanguage by default. */
    language: 'es' | 'en';
}

export interface PaperToSermonOutput {
    /**
     * Sermon title. Often a refined version of the paper title or a
     * homiletical reframing of the passage. The LLM is asked to produce
     * something preachable, not academic.
     */
    title: string;
    /**
     * Single markdown blob — intro, development (with main points),
     * conclusion. Rendered as-is by the sermon detail view's `prose`
     * surface. The transformer is responsible for keeping it self-
     * contained (no callbacks like "see paper section 2"); a sermon
     * read in isolation must stand on its own.
     */
    content: string;
    /**
     * Bible references the sermon cites or alludes to (primary passage
     * + supporting cross-refs). Used by the sermon detail page's
     * sidebar and by future search/series filters.
     */
    bibleReferences: string[];
    /** Identifier of the model that produced this. Stored on the sermon for audit. */
    modelId: string;
    /** Total tokens consumed (prompt + completion). Null if the model didn't report. */
    tokensUsed: number | null;
}
