/**
 * Pastoral Fidelity — Phase 4 PR 1 (ADR-033) — contra-scan report.
 *
 * Contra-scan implements P3 (Acts 20:27, "the whole counsel of God"): before
 * publishing a sermon, the system surfaces chunks from the pastor's library
 * that DISSENT from his central idea, and the pastor must consider at least
 * one with a note of his own. This is the ACTIVE confrontation on the sermon
 * (the per-marker fidelity pass is dormant — ADR-032); it reuses the citation
 * retrieval infra of ADR-031 (personal→CORE priority) but classifies stance
 * instead of building citations.
 *
 * The report is persisted on `sermon.contraScanReport` as the permanent P3
 * audit trail. Purely additive — sermons generated before this feature (or
 * with the `contra_scan` flag off) have it `undefined`.
 */

/**
 * Minimum length (chars, trimmed) of the pastor's consideration note AND of
 * an override justification. Mirrors `FIDELITY_OVERRIDE_MIN_CHARS` (ADR-027 /
 * ADR-029 Q5) so the confrontation bar is consistent across the platform.
 */
export const CONTRA_SCAN_NOTE_MIN_CHARS = 100;
export const CONTRA_SCAN_OVERRIDE_MIN_CHARS = 100;

/**
 * A library chunk the contra-scan classified as dissenting from the central
 * idea. Carries enough metadata to render the same verifiable anchor as a
 * citation popover (book/author/page/excerpt) plus a one-line `tension`
 * summarizing how it pushes back. The excerpt and tension come from real
 * library content — never fabricated (ADR-031 / 07-citation-policy).
 */
export interface DissentingChunk {
    /** `document_chunks` doc id — stable key for the consideration record. */
    chunkId: string;
    resourceId: string;
    resourceTitle: string;
    resourceAuthor: string;
    /** 1-based page when the source carries pagination. */
    page?: number;
    /** Verbatim-bounded excerpt of the chunk (≤280 chars), for the popover. */
    excerpt: string;
    /** One sentence: how this source dissents from / qualifies the central idea. */
    tension: string;
    /** Retrieval similarity to the central idea, 0..1. */
    score: number;
    /** True when the chunk came from the personal library (vs CORE). */
    fromPersonalLibrary: boolean;
}

/**
 * The pastor's recorded engagement with a dissenting position. The note is
 * authored by the pastor (AI-forbidden, like `centralIdea`) — the system
 * never writes it.
 */
export interface ContraScanConsideration {
    /** Which dissenting chunk the pastor engaged. */
    chunkId: string;
    /** Pastor's own reflection; ≥ `CONTRA_SCAN_NOTE_MIN_CHARS` after trim. */
    note: string;
    consideredAt: Date;
}

/**
 * Audit record when the pastor publishes past the soft-block without
 * recording a consideration (e.g. "I addressed this objection in last week's
 * sermon"). Mirrors `GateOverride` (FidelityReport) for cross-feature
 * consistency. Justification ≥ `CONTRA_SCAN_OVERRIDE_MIN_CHARS`.
 */
export interface ContraScanOverride {
    reason: string;
    overriddenAt: Date;
    overriddenBy: string;
}

/**
 * Contra-scan gate status:
 *   - `no-dissent`  — the library surfaced no opposing position (small/empty
 *                     library, or homogeneous sources). Publish proceeds;
 *                     nothing to confront. Not a failure.
 *   - `pass`        — dissent existed and the pastor recorded a consideration
 *                     (or a valid override).
 *   - `soft-block`  — dissent existed and no consideration/override yet.
 */
export type ContraScanStatus = 'no-dissent' | 'pass' | 'soft-block';

export interface ContraScanReport {
    /** The pastor's central idea this scan was run against. */
    centralIdea: string;
    scannedAt: Date;
    /** Dissenting chunks surfaced (empty ⇒ `no-dissent`). */
    dissentingChunks: DissentingChunk[];
    /** The pastor's recorded engagement, when present. */
    consideration?: ContraScanConsideration;
    /** Audit record when published past the soft-block without a consideration. */
    override?: ContraScanOverride;
    status: ContraScanStatus;
}

/**
 * Derive the gate status from the surfaced chunks + the pastor's response.
 * Pure — no clock, no I/O. The caller persists `scannedAt`/`consideredAt`.
 */
export function deriveContraScanStatus(
    dissentingChunks: DissentingChunk[],
    consideration?: ContraScanConsideration,
    override?: ContraScanOverride,
): ContraScanStatus {
    if (dissentingChunks.length === 0) return 'no-dissent';
    if (consideration || override) return 'pass';
    return 'soft-block';
}
