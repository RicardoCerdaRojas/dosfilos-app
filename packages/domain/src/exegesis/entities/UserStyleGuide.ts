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
 * stored as a corpus referenced by `corpusId`. The orchestrator injects
 * relevant chunks into every generation prompt as authoritative format
 * rules.
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
