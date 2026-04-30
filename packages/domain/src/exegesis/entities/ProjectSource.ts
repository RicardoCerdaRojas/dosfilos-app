/**
 * A single source attached to an exegetical paper — typically an extract
 * from a commentary, lexicon, or critical apparatus that the user uploads
 * specifically for this paper.
 *
 * Lifecycle: project-scoped. When the user archives or deletes the paper,
 * these go with it (unless explicitly promoted to the user's library — a
 * v1.5 feature confirmed valuable but deferred).
 *
 * The actual text content is processed via the existing LlamaParse
 * pipeline and stored as a corpus referenced by `corpusId`. We don't
 * duplicate the text here — this entity is purely the relationship
 * (source → paper) with role metadata for citation discipline.
 */
export interface ProjectSource {
    id: string;
    paperId: string;

    /**
     * Reference to the corpus produced by the existing ingestion pipeline.
     * The corpus holds the parsed chunks with page anchoring; this entity
     * tells the LLM-orchestration layer how to USE it (role, citation key)
     * and the future `CitationVerifier` how to MATCH against it.
     */
    corpusId: string;

    /**
     * What this source contributes to the paper. Drives prompt instructions
     * (lexicons are referenced for terms; primary commentaries for verse-by-
     * verse exegesis; the model paper for style mimicry, not citation;
     * critical apparatus for textual variants).
     *
     * The 'model-paper' role is special: it's used as a STYLE template, not
     * a source — citations from it should NEVER appear in the output.
     */
    role: ProjectSourceRole;

    /**
     * Human label as the user typed it on upload — "Lane WBC 47a, pp. 1-30"
     * or "Tuggy Léxico". Shown in the source list, not used for citation.
     */
    displayLabel: string;

    /**
     * Short author key for inline footnotes — "Lane", "Bruce", "Cockerill".
     * Optional because the LLM can derive it from the corpus metadata, but
     * the user can override here if the auto-derivation is wrong (e.g. two
     * Lanes in one paper need disambiguation).
     */
    citationKey: string | null;

    /** Display order in the source list. */
    order: number;

    createdAt: Date;
}

/**
 * Source roles loosely follow what TMS-style papers expect to cite.
 *
 * 'primary-commentary'   — the main exegetical voice for the passage
 *                          (e.g. Lane on Hebrews). Cite generously.
 * 'secondary-commentary' — supporting commentaries; cite where they add
 *                          a distinct angle.
 * 'lexicon'              — BDAG, LSJ, Tuggy. Cite for word meanings;
 *                          subordinate to context.
 * 'critical-apparatus'   — NA28 apparatus, textual variants. Cite when
 *                          variants affect translation.
 * 'historical-context'   — deSilva on honor/shame, Sanders on Judaism.
 *                          Cite when historical-cultural context shapes
 *                          the reading.
 * 'theological-context'  — Bateman on warning passages, etc. Cite when
 *                          theological framing matters.
 * 'model-paper'          — a sample paper (e.g. the user's 1 Peter work)
 *                          used as a STYLE/STRUCTURE template only.
 *                          NEVER cited inline.
 * 'misc'                 — fallback for sources that don't fit cleanly.
 *                          Use sparingly.
 */
export type ProjectSourceRole =
    | 'primary-commentary'
    | 'secondary-commentary'
    | 'lexicon'
    | 'critical-apparatus'
    | 'historical-context'
    | 'theological-context'
    | 'model-paper'
    | 'misc';

/**
 * Roles whose citations may appear in the assembled paper. The 'model-paper'
 * role is intentionally excluded — its content is for style emulation only,
 * and the prompt + verifier must enforce that.
 */
export const CITABLE_SOURCE_ROLES: ReadonlySet<ProjectSourceRole> = new Set([
    'primary-commentary',
    'secondary-commentary',
    'lexicon',
    'critical-apparatus',
    'historical-context',
    'theological-context',
    'misc',
]);

export function isCitable(role: ProjectSourceRole): boolean {
    return CITABLE_SOURCE_ROLES.has(role);
}
