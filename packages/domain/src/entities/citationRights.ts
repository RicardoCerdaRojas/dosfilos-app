/**
 * Rights-aware citation primitives — shared between the CORE Library
 * `Confession` catalog and the per-user `LibraryResource`. Adopted by
 * ADR-006; spec lives in [docs/pastoral-fidelity/07-citation-policy.md].
 *
 * Kept as a separate module so any source-like entity can reuse the same
 * union types without circular dependencies between Confession.ts and
 * LibraryResource.ts.
 */

/**
 * The two-axis model from ADR-006 § 2:
 *   ingestion_status × license → operational behaviour
 */
export type IngestionStatus =
    | 'approved_full_ingestion'
    | 'approved_full_ingestion_with_attribution'
    | 'approved_full_ingestion_for_historical_text_only'
    | 'approved_metadata_only'
    | 'requires_manual_review';

export type License =
    | 'Public Domain'
    | 'CC BY 4.0'
    | 'CC BY-SA 4.0'
    | 'All rights reserved / permission required'
    | 'Internally created'
    /** Backfill default for pre-migration chunks — needs admin classification. */
    | 'unknown'
    | string;

export type RiskLevel = 'low' | 'low_to_medium' | 'medium' | 'high_for_full_ingestion';

/**
 * Citation render templates per context. The `{section_reference}`
 * placeholder is substituted at render time with the chunk/section
 * reference (e.g. "1.1", "Q&A 5"). Mirrors the JSON canonical schema.
 */
export interface CitationTemplates {
    short: string;
    footnote: string;
    bibliography: string;
    /** Used in Faculty chat / RAG responses. */
    ragDisplay: string;
}

/**
 * The four citation styles from the JSON `citation_output_rules`. Mapped
 * to `ArtifactType` in Phase 5 ([06-pedagogy-applied.md § Mapeo]).
 * `modern_statement_warning` is the override style applied whenever a
 * source's `ingestionStatus === 'approved_metadata_only'`.
 */
export type CitationStyle =
    | 'sermon'
    | 'bible_study'
    | 'essay_or_article'
    | 'rag_answer'
    | 'modern_statement_warning';
