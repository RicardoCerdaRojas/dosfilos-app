/**
 * Pastoral Fidelity — confessional catalog entities.
 *
 * Mirrors the canonical JSON seed at
 * `docs/pastoral-fidelity/data/core-library-seed.json` (adopted by ADR-006).
 * Each `Confession` is one CORE Library source; sectioned sources also carry
 * a list of `ConfessionSection` documents stored under
 * `/confessions/{id}/sections/{sectionId}`.
 *
 * `doctrineLevel` lives on the section (not the confession) because the
 * three-witness mechanism (Phase 2) inspects individual claims, not whole
 * confessions. Initial tagging is LLM-curated + Ricardo-reviewed in PR 0.4.
 */

import type {
    License,
    IngestionStatus,
    RiskLevel,
    CitationTemplates,
} from './citationRights';

/**
 * High-level classification: does this source decompose into discrete
 * sections (creeds, confessions, catechisms) or is it a reference work
 * we cite holistically (Schaff collections, biblical texts)?
 */
export type ConfessionSectionType = 'sectioned' | 'reference';

/**
 * Tracks how much of a sectioned source has been ingested into Firestore.
 * Stubs in catalog start as `pending`; partial ingest (e.g. WCF chapter 1
 * only) becomes `partial`; full ingest becomes `complete`.
 */
export type ConfessionIngestStatus = 'pending' | 'partial' | 'complete' | 'not-applicable';

/**
 * The three operational levels from the pedagogy manifesto
 * ([06-pedagogy-applied.md § Sistema de tres niveles]). Set per-section
 * during the LLM tagging pass in PR 0.4.
 */
export type DoctrineLevel = 'core' | 'distinctive' | 'open-evangelical';

/**
 * One discrete section of a sectioned source — WCF chapter+paragraph,
 * Heidelberg Q&A, creed clause, etc. Stored under
 * `/confessions/{confessionId}/sections/{sectionId}`.
 */
export interface ConfessionSection {
    sectionId: string;
    /** Human-readable reference: "1.1", "Q&A 1", "Article III", etc. */
    sectionReference: string;
    /** Optional heading from the source. */
    title?: string;
    /** Full text of the section. For catechisms this is question + answer. */
    text: string;
    /**
     * Sub-questions when format is Q&A. Q&A 1 of Heidelberg, for example,
     * has both `question` and `answer` distinguishable. Falls back to `text`
     * for non-Q&A formats.
     */
    question?: string;
    answer?: string;
    /** Topical tags useful for search; populated during tagging pass. */
    topics?: string[];
    /** Set in PR 0.4. Undefined = not yet tagged. */
    doctrineLevel?: DoctrineLevel;
    /**
     * Tracks the lifecycle of the LLM-curated + Ricardo-reviewed tagging.
     * `pending-pastoral-review` ships once the LLM tag lands; flips to
     * `reviewed` after Ricardo signs off. Lets PR 0.4 ship without
     * blocking on a pastoral review session.
     */
    reviewStatus?: 'pending-pastoral-review' | 'reviewed';
    /** Optional rationale from the LLM tagging pass. */
    levelRationale?: string;
    /** Order of the section within its parent confession. */
    order: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface Confession {
    /** Stable identifier matching `source_id` from the JSON seed. */
    id: string;
    title: string;
    shortTitle: string;
    authorOrEditor?: string;
    /** May be a year or a free-text date range ("Early church..."). */
    year: number | string;
    /** Free-form from the JSON: 'Confession' | 'Catechism' | 'Ecumenical creed' | ... */
    sourceType: string;
    tradition: string;
    language: string;
    sourceUrl: string;
    /** Indicates whether this source decomposes into sections we ingest. */
    sectionType: ConfessionSectionType;
    /** Where we are on filling in sections (sectioned sources only). */
    ingestStatus: ConfessionIngestStatus;
    /** Total sections persisted so far. */
    sectionCount: number;

    // Rights-aware metadata (mirrors ADR-006 / 07-citation-policy)
    rightsStatus: string;
    license: License;
    licenseUrl?: string;
    copyrightNotice?: string;
    ingestionStatus: IngestionStatus;
    riskLevel: RiskLevel;
    requiredAttribution?: string[];
    specialHandling?: string[];
    citation: CitationTemplates;
    ragUse?: string[];
    doNotUseFor?: string[];

    /** Affirms ecumenical core (Apostles/Nicene/Chalcedon) — mostly true. */
    ecumenicalAffirmation?: boolean;
    /** Documents inside a historical collection (Schaff Vol II → 4 creeds). */
    recommendedDocumentsInside?: string[];

    createdAt: Date;
    updatedAt: Date;
}
