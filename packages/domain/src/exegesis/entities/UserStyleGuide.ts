import type { StyleGuideManifest } from './StyleGuideManifest';

/**
 * A style guide owned by a single user, transversal across all their
 * exegetical papers. Typical content: TMS 2024-25 style sheet covering
 * citation format, footnote rules, abbreviation tables, bibliography
 * formatting, paragraph conventions.
 *
 * Lifecycle: persistent at user-level. Updated only when the user's
 * seminary publishes a new revision — most users will have one or two
 * of these in their lifetime. Decoupled from any specific paper so the
 * same guide flows into every paper automatically.
 *
 * The actual text is processed via the existing LlamaParse pipeline and
 * stored as a corpus referenced by `corpusId`. After ingestion, the
 * `IStyleGuideManifestExtractor` produces a structured `manifest` of
 * the guide's mechanical rules (citation formats, ibid behavior,
 * quotation thresholds) — that manifest is stored alongside the corpus
 * pointer here and injected into prompts + the post-processing
 * formatter, so deterministic format rules don't depend on the LLM
 * re-reading the guide every time.
 */
export interface UserStyleGuide {
    id: string;
    ownerId: string;

    /** Human label — "TMS 2024-25", "Chicago 17th", "SBL Handbook of Style". */
    displayName: string;

    /**
     * Reference to the corpus produced by ingestion. Same pattern as
     * `ProjectSource.corpusId` so the orchestration layer treats both
     * uniformly during retrieval.
     */
    corpusId: string;

    /**
     * Structured rules extracted from the guide. Used by:
     *   - the orchestrator's prompt builder (rules block injected
     *     verbatim alongside the raw guide text)
     *   - the `IStyleFormatter` post-processor that mechanically
     *     enforces footnote format, ibid, quote marks, etc.
     *
     * Nullable during a brief window after upload (extraction is
     * async — typically completes within seconds of LlamaParse
     * finishing). The setup UI shows a "manifest is processing"
     * state during that window. Generation rejects a null manifest
     * and tells the user to retry once extraction completes (or
     * explicitly opt in to the system default while waiting).
     */
    manifest: StyleGuideManifest | null;

    /**
     * Optional version string ("2024-25", "17th edition"). Helps the user
     * recognize which guide is loaded; not used for retrieval.
     */
    version: string | null;

    /**
     * Whether this guide is the current default for the user. Exactly one
     * guide per user is `isActive: true` at any time. New papers default
     * to using the active guide; users can pin a non-active guide on a
     * specific paper if they're following a different style there.
     */
    isActive: boolean;

    uploadedAt: Date;
    updatedAt: Date;
}

export type UserStyleGuideDraft = Omit<
    UserStyleGuide,
    'id' | 'uploadedAt' | 'updatedAt'
>;
