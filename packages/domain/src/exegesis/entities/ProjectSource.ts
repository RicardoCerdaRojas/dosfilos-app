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

    createdAt: Date;
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
