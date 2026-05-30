/**
 * Pastoral Fidelity — Phase 3 (ADR-029) claim/source fidelity report.
 *
 * The second-pass LLM evaluator runs over every `[N]` marker in a generated
 * sermon and asks: does the cited chunk actually support the sentence to
 * the left of the marker? Output is persisted on the sermon doc as
 * `fidelityReport` and consumed by the FidelityReviewPanel in the editor.
 *
 * Three downstream validators (PR 3 plurality / PR 4 authority /
 * PR 5 attribution) attach as optional sub-reports on the same envelope so
 * the panel + the pre-publish gate read a single document.
 *
 * Scope of this file (PR 1):
 *   - Type definitions for the report + verdicts + override
 *   - The `extractClaimForMarker` pure helper (Q2 — sentence-before-marker)
 *   - The `buildEmptyFidelityReport` factory (used when the manifest is
 *     empty so the panel still has a stable shape to render)
 *
 * The gate thresholds + summary computation live in
 * `services/computeFidelitySummary.ts` (Atomic 3); the sub-report types
 * (PluralityReport / AttributionReport / AuthorityReport) are stubs here
 * and filled in by PRs 3/4/5.
 */

/**
 * Verdict the evaluator emits for a single marker.
 *
 *  - `supports`    — chunk clearly supports the claim.
 *  - `partial`     — chunk partially supports it; nuance, scope, or framing
 *                    mismatch. Soft-block territory (Q3).
 *  - `unrelated`   — chunk does not address the claim. Hard-block when the
 *                    overall ratio crosses the threshold.
 *  - `contradicts` — chunk says the opposite of the claim. Hard-block.
 */
export type FidelityVerdictKind = 'supports' | 'partial' | 'unrelated' | 'contradicts';

/**
 * Which LLM emitted this verdict. Flash batched evaluates everything; Sonnet
 * escalation re-judges the marginals (`partial` / `contradicts`) for a more
 * careful read before they hit the pastor (Q1).
 */
export type FidelityModel = 'flash' | 'sonnet';

/**
 * Snapshot of the cited chunk at evaluation time — mirrors the relevant
 * fields of `CitationManifestEntry` so the panel can render without a
 * second round-trip to the library.
 */
export interface FidelityCitedSource {
    /** Manifest S-ID (e.g. "S1"). */
    sourceId: string;
    /** Library resource doc the chunk lives in. */
    resourceId: string;
    /** Specific chunk within the resource. */
    chunkId: string;
    /** Snapshot title for display. */
    title: string;
    /** Author snapshot if present. */
    author?: string;
    /** Page snapshot if present. */
    page?: string;
    /** Short excerpt (≤280 chars) — same field as the manifest entry. */
    excerpt: string;
}

export interface FidelityVerdict {
    /** Numeric marker the verdict belongs to (`[N]`). */
    marker: number;
    /**
     * The sentence immediately to the left of the marker (Q2). Stored
     * verbatim so the panel can display what was evaluated even after the
     * editor mutates the prose; staleness is tracked via `stale` below.
     */
    claim: string;
    citedSource: FidelityCitedSource;
    verdict: FidelityVerdictKind;
    /** Short LLM justification — surfaces in the panel tooltip. */
    reasoning: string;
    /** 0..1 model self-reported confidence. */
    confidence: number;
    modelUsed: FidelityModel;
    evaluatedAt: Date;
    /**
     * Set to `true` when the marker's claim text changed since the verdict
     * was issued (re-cite, re-generate). Cache invalidation per Q6: only
     * the stale verdicts re-run on the next pass.
     */
    stale?: boolean;
}

export interface FidelitySummary {
    supports: number;
    partial: number;
    unrelated: number;
    contradicts: number;
    /** All verdicts including stale ones — the panel filters as needed. */
    totalMarkers: number;
    /** `(unrelated + contradicts) / totalMarkers`. Drives the hard-block (Q3). */
    unrelatedRatio: number;
    /** `partial / totalMarkers`. Drives the soft-block (Q3). */
    partialRatio: number;
}

/**
 * Gate decision computed by `computeFidelitySummary` (Atomic 3):
 *   - `pass`        — under both thresholds; publish proceeds.
 *   - `soft-block`  — partialRatio > 10% OR any plurality / authority
 *                     failure (PR 3/4). Override path with ≥100-char
 *                     justification (ADR-027 reused, Q5).
 *   - `hard-block`  — unrelatedRatio > 20%. No override (ADR-029 §Q3).
 */
export type FidelityGateStatus = 'pass' | 'soft-block' | 'hard-block';

/**
 * Audit record when the pastor proceeds despite a soft-block. Hard-blocks
 * NEVER produce a GateOverride — the publish call is refused server-side.
 */
export interface GateOverride {
    /** Pastor's justification; ≥ `FIDELITY_OVERRIDE_MIN_CHARS`. */
    reason: string;
    overriddenAt: Date;
    overriddenBy: string;
    /** Which dimension the override applies to (multiple = first wins). */
    bypassedKind: 'partial' | 'plurality' | 'authority';
}

/**
 * Stub for the Plurality sub-report (PR 3). Defined as an empty interface
 * here so the field on `FidelityReport` is type-stable from PR 1; PR 3
 * extends with `substantiveClaims` + `failures`.
 */
export interface PluralityReport {
    /** Marker fields filled in by PR 3 — kept empty for forward-compat. */
    readonly placeholder?: never;
}

/**
 * Stub for the Authority sub-report (PR 4). PR 4 extends with
 * `authorityViolations` (claim citing a confession as final authority).
 */
export interface AuthorityReport {
    readonly placeholder?: never;
}

/**
 * Stub for the Attribution sub-report (PR 5). PR 5 extends with
 * `requiredAttributions` + `missingAttributions` + `ok`.
 */
export interface AttributionReport {
    readonly placeholder?: never;
}

export interface FidelityReport {
    /** Schema version — bumped when the shape changes. */
    version: typeof FIDELITY_REPORT_VERSION;
    /** Stable id (Firestore doc id) for the report — referenced from audit. */
    reportId: string;
    /** Sermon the report belongs to. 1:1; the report lives on the sermon doc. */
    sermonId: string;
    generatedAt: Date;
    /** Which model(s) contributed verdicts. `mixed` when Flash + Sonnet. */
    modelTier: 'flash' | 'sonnet' | 'mixed';
    verdicts: FidelityVerdict[];
    summary: FidelitySummary;

    // Sub-reports opt-in (ADR-029 § discrepancy D3 — composables, not
    // monolithic). PR 3/4/5 attach these as they ship.
    pluralityReport?: PluralityReport;
    authorityReport?: AuthorityReport;
    attributionReport?: AttributionReport;

    gateStatus: FidelityGateStatus;
    gateOverride?: GateOverride;
}

/** Schema version constant — increments when the report shape changes. */
export const FIDELITY_REPORT_VERSION = '1' as const;

/**
 * Minimum chars for a soft-block override justification (Q3 / ADR-029).
 * Aligned with `STUDY_DEPTH_OVERRIDE_MIN_CHARS` (Phase 2.5 ADR-027) — one
 * paternalism policy, not two.
 */
export const FIDELITY_OVERRIDE_MIN_CHARS = 100;

/**
 * Build an empty report so the editor panel always has a stable shape to
 * render — used by `RunFidelityPassUseCase` when the sermon has zero
 * markers in its manifest (legacy sermons, drafts without citations).
 *
 * `gateStatus: 'pass'` is the safe default: with no markers there is
 * nothing for the gate to block.
 */
export function buildEmptyFidelityReport(input: {
    reportId: string;
    sermonId: string;
    generatedAt: Date;
}): FidelityReport {
    return {
        version: FIDELITY_REPORT_VERSION,
        reportId: input.reportId,
        sermonId: input.sermonId,
        generatedAt: input.generatedAt,
        modelTier: 'flash',
        verdicts: [],
        summary: {
            supports: 0,
            partial: 0,
            unrelated: 0,
            contradicts: 0,
            totalMarkers: 0,
            unrelatedRatio: 0,
            partialRatio: 0,
        },
        gateStatus: 'pass',
    };
}

// ─────────────────────────────────────────────────────────────────────────
// Claim extraction (Q2 — sentence-before-marker)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Matches a single marker `[N]` or `[N, M, ...]`. The numbers group captures
 * the comma-separated digits so the caller can decide whether the marker
 * belongs to a given N.
 */
const MARKER_REGEX = /\[(\d+(?:\s*,\s*\d+)*)\]/g;

/**
 * Sentence terminators considered for "the sentence before [N]". Period,
 * question mark, and exclamation mark — matches the conventions used by
 * `SermonContent` prose (Spanish + English). Trailing punctuation is
 * preserved on the extracted claim because the evaluator's prompt asks the
 * LLM to evaluate the full sentence, not a trimmed proposition.
 */
const SENTENCE_BOUNDARY = /[.!?](?=\s|$)/g;

/**
 * Extract the sentence immediately to the left of the FIRST occurrence of
 * marker `[markerN]` in `prose`. Returns `null` when the marker is absent
 * from the prose or when there is no sentence preceding it. Pure.
 *
 * Q2 — granularity is "full sentence", not a semantically-extracted claim
 * (Sonnet escalation is enough nuance; cheap regex keeps the cost down).
 */
export function extractClaimForMarker(prose: string, markerN: number): string | null {
    if (!prose || markerN <= 0 || !Number.isInteger(markerN)) return null;

    MARKER_REGEX.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = MARKER_REGEX.exec(prose)) !== null) {
        const numbers = match[1].split(/\s*,\s*/).map((n) => Number.parseInt(n, 10));
        if (!numbers.includes(markerN)) continue;

        const before = prose.slice(0, match.index);
        const claim = lastSentenceOf(before);
        return claim;
    }
    return null;
}

/**
 * Return the last sentence inside `text` (trailing punctuation preserved)
 * or `null` when `text` has no terminator and no non-whitespace content.
 */
function lastSentenceOf(text: string): string | null {
    const trimmed = text.replace(/\s+$/u, '');
    if (trimmed.length === 0) return null;

    let lastEnd = -1;
    SENTENCE_BOUNDARY.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = SENTENCE_BOUNDARY.exec(trimmed)) !== null) {
        lastEnd = m.index;
    }
    if (lastEnd === -1) return null;

    // Find the start of this sentence: one past the previous terminator,
    // or the start of the string.
    let start = 0;
    SENTENCE_BOUNDARY.lastIndex = 0;
    let prev: RegExpExecArray | null;
    while ((prev = SENTENCE_BOUNDARY.exec(trimmed)) !== null) {
        if (prev.index >= lastEnd) break;
        start = prev.index + 1;
    }

    const sentence = trimmed.slice(start, lastEnd + 1).trim();
    return sentence.length > 0 ? sentence : null;
}
