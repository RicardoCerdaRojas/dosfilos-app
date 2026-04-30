import type { PassageReference } from '../../bible/canon/passage-reference';
import type { ProjectSource } from './ProjectSource';
import type { ExegeticalStep } from './ExegeticalStep';

/**
 * Top-level entity for a single exegetical paper.
 *
 * Lifecycle (`phase`):
 *   - 'configuring' — passage + sources + style guide are being set up;
 *     no generation has run yet.
 *   - 'in-progress' — at least one step has been generated; user is
 *     iterating over verses → conclusion → introduction.
 *   - 'assembled' — the full paper has been concatenated; user may
 *     still edit `assembledMarkdown` freely before exporting.
 *   - 'archived' — soft-deleted; preserved for audit but hidden in the list.
 *
 * Why a dedicated entity (not a kind of `AIProject`):
 * Faculty's `AIProject` represents conversational sessions; exegetical papers
 * are documental, multi-step, with strict citation discipline and step-version
 * history. Forcing both into one model would require a discriminator field
 * and duplicate state machines. Confirmed with the user.
 */
export interface ExegeticalPaper {
    id: string;
    ownerId: string;
    createdAt: Date;
    updatedAt: Date;

    /**
     * The passage being studied. Validated against `BIBLE_CANON` at create time
     * via `parsePassageReference` or `buildPassageReference`. Stored canonical;
     * the picker and free-text input both normalize to this shape.
     */
    passage: PassageReference;

    /** Output language for the assembled paper (also drives prompt selection). */
    displayLanguage: 'es' | 'en';

    /** Optional human title; defaults to the formatted passage. */
    title?: string;

    /**
     * Reference to the user-level style guide active for this paper. The
     * guide is uploaded once per user and reused across papers; we store the
     * id (not a snapshot) so seminary updates flow through automatically
     * unless the user pins a specific version on a per-paper basis later.
     */
    styleGuideId: string;

    /**
     * Project-scoped corpus — extracts of commentaries, lexicons, and the
     * critical apparatus uploaded specifically for this paper. Ephemeral by
     * design: when the paper is archived, these go with it (unless the user
     * promotes one to their library, a v1.5 feature).
     */
    sources: ProjectSource[];

    phase: ExegeticalPaperPhase;

    /**
     * Steps in display order: verses (one per verse in the passage range),
     * then conclusion, then introduction, then assembly. The introduction
     * step appears last in the wizard but the assembled output places it
     * first — a TMS convention the user explicitly asked us to honor.
     */
    steps: ExegeticalStep[];

    /**
     * Pointer to the step the user is currently working on. May be null when
     * the paper is in 'configuring' phase or fully assembled.
     */
    currentStepId: string | null;

    /**
     * The full paper after the assembly step runs (or after the user edits
     * the assembled output manually). Source of truth for export. Null
     * before assembly. Edits made here AFTER assembly do not propagate back
     * to individual steps — that's intentional (final-pass edits are the
     * author's prerogative and shouldn't be re-validated).
     */
    assembledMarkdown: string | null;

    /** Soft-delete marker. */
    archivedAt: Date | null;
}

export type ExegeticalPaperPhase =
    | 'configuring'
    | 'in-progress'
    | 'assembled'
    | 'archived';

/**
 * Shape used by `CreatePaper` use cases — id and timestamps are assigned
 * by the repository; phase always starts as 'configuring' even if sources
 * are provided up front (wizard may collect them later).
 */
export type ExegeticalPaperDraft = Omit<
    ExegeticalPaper,
    'id' | 'createdAt' | 'updatedAt' | 'phase' | 'steps' | 'currentStepId' | 'assembledMarkdown' | 'archivedAt'
>;
