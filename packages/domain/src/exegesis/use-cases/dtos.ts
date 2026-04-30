/**
 * Input/output shapes for exegesis use cases.
 *
 * Why this file exists without the use-case implementations: the UI starts
 * calling these contracts before the orchestration layer is built. Locking
 * the input/output shapes early lets web and infrastructure progress in
 * parallel without negotiating field names ad-hoc. Implementations live
 * in `packages/application/exegesis/use-cases/` once we add them.
 *
 * Convention: each use case has `<Name>Input` (everything the use case
 * needs that isn't injected) and either `<Name>Output` (a value object) or
 * the use case returns a domain entity directly. Errors are thrown — we
 * use plain `Error` subclasses or domain-specific error types declared
 * here as needed.
 */

import type { PassageReference } from '../../bible/canon/passage-reference';
import type { SourceType } from '../entities/SourceType';

// ── CreateExegeticalPaper ───────────────────────────────────────────────

export interface CreateExegeticalPaperInput {
    ownerId: string;
    /**
     * Already validated by `parsePassageReference` or `buildPassageReference`
     * before reaching the use case. The use case does not re-parse — it
     * trusts the caller (UI) to have done that.
     */
    passage: PassageReference;
    displayLanguage: 'es' | 'en';
    /**
     * Optional title; if omitted the use case falls back to the formatted
     * passage ("Hebreos 1:1-4").
     */
    title?: string;
    /**
     * Free-text assignment brief: the professor's prompt + the student's
     * focus. Threaded through to every step's system prompt so the LLM
     * keeps the paper's framing consistent. Optional at create time —
     * the student can refine it from the setup page later.
     */
    assignmentBrief?: string | null;
    /**
     * Reference to a `UserStyleGuide` already uploaded by the user. May be
     * null in v1 — the wizard's style-guide step is a v1.5 placeholder, so
     * papers are created without a guide and the orchestrator validates
     * non-null only when the user attempts to generate. The use case still
     * verifies that any provided id exists and belongs to the user.
     */
    styleGuideId: string | null;
    /**
     * Optional initial sources. May also be empty — the user can add them
     * later via `AddProjectSource` while the paper is in 'configuring'.
     */
    initialSources?: AddProjectSourceInput[];
}

// ── UpdatePaperBrief ────────────────────────────────────────────────────
//
// Tiny stand-alone DTO so the setup-page "edit framing" form can call
// the use case without re-sending all the create fields. Returns the
// updated paper for the UI to refresh.

export interface UpdatePaperBriefInput {
    ownerId: string;
    paperId: string;
    /** New brief value. Pass empty string or null to clear. */
    assignmentBrief: string | null;
}

// ── AddProjectSource ────────────────────────────────────────────────────

export interface AddProjectSourceInput {
    /**
     * The corpus already produced by ingestion. The UI uploads + waits for
     * processing first; this use case only attaches the result to the paper.
     */
    corpusId: string;
    sourceType: SourceType;
    displayLabel: string;
    citationKey?: string;
}

// ── UpdateProjectSource ─────────────────────────────────────────────────

export interface UpdateProjectSourceInput {
    sourceId: string;
    sourceType?: SourceType;
    displayLabel?: string;
    citationKey?: string | null;
    order?: number;
}

// ── FinalizeConfiguration ───────────────────────────────────────────────
//
// Transitions the paper from 'configuring' to 'in-progress'. Triggers
// `seedStepsForPassage` so the wizard can navigate the user to step #1.
// The use case rejects if: no style guide, no citable sources, or the
// passage is invalid. Idempotent (re-calling on an in-progress paper
// returns the existing step list).

export interface FinalizeConfigurationInput {
    ownerId: string;
    paperId: string;
}

// ── GenerateStep ────────────────────────────────────────────────────────
//
// Triggers an LLM generation for a specific step. The orchestration layer
// (gemini service) handles streaming. The use case spec only commits to
// the input shape — the streaming chunk callback lives in the orchestrator
// interface, NOT here, to keep this file pure-data.

export interface GenerateStepInput {
    ownerId: string;
    paperId: string;
    stepId: string;
    /**
     * Optional regeneration hint. Passed verbatim into the prompt and stored
     * on the resulting version so the UI can show "you asked for X".
     */
    regenerationHint?: string;
}

// ── AcceptStep ──────────────────────────────────────────────────────────

export interface AcceptStepInput {
    ownerId: string;
    paperId: string;
    stepId: string;
    /**
     * Which version of the step the user is accepting. Usually the
     * `current` version of the step, but specifying it explicitly lets us
     * tolerate races (a regeneration finishing right before the user
     * clicks accept on the previous version).
     */
    versionId: string;
}

// ── SaveManualEdit ──────────────────────────────────────────────────────

export interface SaveManualEditInput {
    ownerId: string;
    paperId: string;
    stepId: string;
    markdown: string;
}

// ── AssemblePaper ───────────────────────────────────────────────────────
//
// Concatenates accepted step content into `assembledMarkdown`. Order in
// the output is: introduction → verses (in canonical order) → conclusion
// → bibliography. Note: introduction is the LAST step generated but the
// FIRST in the output — TMS convention.

export interface AssemblePaperInput {
    ownerId: string;
    paperId: string;
}

// ── UploadStyleGuide ────────────────────────────────────────────────────
//
// Wraps the existing ingestion pipeline + creates the `UserStyleGuide`
// pointer. The actual file processing happens in infrastructure; this DTO
// only describes what the user supplied.

export interface UploadStyleGuideInput {
    ownerId: string;
    displayName: string;
    /**
     * The already-processed corpus id. The UI shows progress on the upload
     * step and only calls this once ingestion completes.
     */
    corpusId: string;
    version?: string;
    /**
     * Whether to mark this as the new active guide. Defaults to true if
     * the user has no active guide; otherwise the user explicitly opts in
     * (an inactive guide can still be pinned to specific papers later).
     */
    setActive?: boolean;
}
