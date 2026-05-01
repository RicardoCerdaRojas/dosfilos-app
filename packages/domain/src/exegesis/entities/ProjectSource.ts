import type { SourceType } from './SourceType';
import { isCitableSourceType } from './SourceType';

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
 * (source → paper) with academic metadata for citation discipline.
 *
 * Two consumption modes:
 *   - `'full-document'` (default, retro-compat): the orchestrator reads
 *     the corpus's full `textContent` and inlines it in the prompt. Used
 *     when the user uploads a tightly-scoped extract directly to this
 *     paper (Caso 3 of the v1.5 design).
 *   - `'extracted-excerpts'` (v1.5+): the orchestrator inlines only the
 *     `excerpts` array, pre-curated from a larger library resource via
 *     semantic retrieval against the paper's passage. The library
 *     resource itself stays referenced via `sourceLibraryResourceId` so
 *     the user can "view original" and re-extract if needed.
 *
 * Taxonomy note: as of the rubric-driven redesign the `sourceType` field
 * uses the granular `SourceType` catalog (13 values with rigor tiers).
 * The earlier `role` field with 8 flat values (`primary-commentary`, etc.)
 * is migrated via `migrateLegacyRole` in `SourceType.ts`.
 */
export interface ProjectSource {
    id: string;
    paperId: string;

    /**
     * Reference to the corpus produced by the existing ingestion pipeline.
     * The corpus holds the parsed chunks with page anchoring; this entity
     * tells the LLM-orchestration layer how to USE it (type, citation key)
     * and the future `CitationVerifier` how to MATCH against it.
     */
    corpusId: string;

    /**
     * Granular academic type — drives rubric compliance (minimum counts
     * per type), per-step plan defaults (which step kinds typically use
     * this type), and the prompt's citation-discipline budget. See
     * `SOURCE_TYPE_CATALOG` for the metadata behind each value.
     *
     * The 'style-template-paper' type is special: it's used as a STYLE
     * template, not a source — citations from it must NEVER appear in
     * the output. The orchestrator enforces this via the catalog's
     * `defaultCitationDiscipline: 'never-cite'`.
     */
    sourceType: SourceType;

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

    /**
     * How this source contributes its text to the orchestrator prompt.
     * Default `'full-document'` keeps existing papers and the direct-
     * upload flow (Caso 3) working unchanged. `'extracted-excerpts'` is
     * the v1.5 curated-excerpt mode — only the chunks in `excerpts`
     * reach the prompt.
     */
    mode: ProjectSourceMode;

    /**
     * Pre-curated chunks for `mode === 'extracted-excerpts'`. Empty for
     * `'full-document'`. An empty array on an extracted source is a
     * valid state (UI surfaces a warning that the source won't
     * contribute) — it should NOT auto-delete the source.
     */
    excerpts: ReadonlyArray<ProjectSourceExcerpt>;

    /**
     * Backref to the originating `library_resources/{id}` doc when the
     * source was created by the library-extraction flow. Lets the UI
     * offer "view original PDF" and lets the use case re-extract
     * against the same resource. Null for the direct-upload flow
     * (Caso 3) where the corpus is project-scoped.
     */
    sourceLibraryResourceId: string | null;

    createdAt: Date;
}

/**
 * Discriminator for `ProjectSource.mode`. Kept as a top-level type so
 * downstream code can type-narrow without importing the whole entity.
 */
export type ProjectSourceMode = 'full-document' | 'extracted-excerpts';

/**
 * One curated chunk extracted from a library resource, ranked by
 * similarity to the paper's passage. Mirrors the `document_chunks`
 * shape one-to-one (one excerpt = one chunk at extraction time) but
 * the user can edit the text afterwards — `userEdited` records that.
 */
export interface ProjectSourceExcerpt {
    /**
     * The actual chunk text. Can be edited by the user after
     * extraction; if so, `userEdited` flips to true so re-extraction
     * knows to preserve this entry instead of overwriting it.
     */
    text: string;

    /**
     * Citation anchor extracted from the chunk's metadata at retrieval
     * time — typically `"p. 47"` or `"comm. on v.1"`. Surfaced to the
     * orchestrator so the prompt can ask Gemini to cite using this
     * label, and shown in the UI next to the excerpt for review.
     */
    sourceLocation: string;

    /**
     * Cosine similarity score from the embedding retrieval, normalized
     * to `[0, 1]`. Used by the UI to rank/filter excerpts; not passed
     * to the orchestrator (the LLM should treat all excerpts as
     * equally relevant once the user accepted them).
     */
    relevanceScore: number;

    /**
     * Marks excerpts the user has touched (text edited or manually
     * added). Re-extraction PRESERVES these — never overwrites — and
     * appends fresh excerpts after them. Set automatically on the
     * first text-change in the UI.
     */
    userEdited: boolean;

    /**
     * When the user last edited this excerpt. Null for excerpts the
     * user never touched (matches `userEdited === false`). Useful for
     * audit trails and stale-excerpt detection.
     */
    editedAt: Date | null;
}

/**
 * @deprecated Use `SourceType` from './SourceType'. Retained as a
 * type alias only so transitional code compiles. Remove once the
 * pre-redesign references in legacy snapshots have all been migrated.
 */
export type ProjectSourceRole = SourceType;

/** @deprecated Use `isCitableSourceType` from './SourceType'. */
export function isCitable(type: SourceType): boolean {
    return isCitableSourceType(type);
}
