import type { PassageReference } from '../../bible/canon/passage-reference';
import type { ProjectSource } from './ProjectSource';
import type { ExegeticalStep } from './ExegeticalStep';
import type { PaperRubric } from './PaperRubric';
import type { StepSourcePlan } from './StepSourcePlan';

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
     * Free-text framing of the paper — typically a paragraph that
     * combines what the seminary professor assigned ("escribir un
     * análisis exegético del prólogo cristológico de Hebreos 1:1-4")
     * and the angle the student wants to take ("argumentar que la
     * revelación final en el Hijo establece la superioridad temática
     * de la epístola"). Treated by the orchestrator as PAPER-LEVEL
     * authoritative guidance — it appears verbatim in the system
     * prompt of every step generation so the introduction, verses,
     * and conclusion all stay aligned with the same framing.
     *
     * Different from rubric (mechanical grading criteria) and from
     * style guide (mechanical formatting rules): this is the paper's
     * narrative identity. v1 uses a single text blob; v1.5+ may
     * split into "professor brief" vs "student thesis" if the
     * pattern is worth differentiating.
     *
     * Nullable: a student may create a paper without a brief and the
     * orchestrator will fall back to neutral framing. The setup UI
     * encourages filling it but doesn't block.
     */
    assignmentBrief: string | null;

    /**
     * Reference to the user-level style guide active for this paper. The
     * guide is uploaded once per user and reused across papers; we store
     * the id (not a snapshot) so seminary updates flow through automatically
     * unless the user pins a specific version on a per-paper basis later.
     *
     * Nullable during the 'configuring' phase: the v1 setup wizard does NOT
     * collect a guide (that step is v1.5 placeholder). Phase transition to
     * 'in-progress' must enforce non-null before any generation runs — the
     * orchestrator needs an actual guide to inject into prompts.
     */
    styleGuideId: string | null;

    /**
     * Project-scoped corpus — extracts of commentaries, lexicons, and the
     * critical apparatus uploaded specifically for this paper. Ephemeral by
     * design: when the paper is archived, these go with it (unless the user
     * promotes one to their library, a v1.5 feature).
     */
    sources: ProjectSource[];

    /**
     * Rubric the student is working against — either uploaded from the
     * seminary's grading sheet or the system default. Drives gap detection
     * (which source types are missing) and seeds the structural plan.
     *
     * Nullable during the very first moment after `createPaper` runs; the
     * setup UI's first sub-step always populates it (uploading or applying
     * the default) before letting the user proceed. Generation must reject
     * a null rubric.
     */
    rubric: PaperRubric | null;

    /**
     * Per-step source-emphasis plan the student configured (or accepted
     * from defaults). Drives prompt weights at generation time. May be
     * the empty plan if the student hasn't visited the structural-plan
     * sub-step yet — the orchestrator falls back to rubric defaults in
     * that case.
     */
    stepPlan: StepSourcePlan;

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
 *
 * `rubric` and `stepPlan` are also omitted at draft time — the create
 * use case applies the system default rubric and the empty plan, and the
 * setup UI's later sub-steps overwrite them with the student's choices.
 */
export type ExegeticalPaperDraft = Omit<
    ExegeticalPaper,
    | 'id'
    | 'createdAt'
    | 'updatedAt'
    | 'phase'
    | 'steps'
    | 'currentStepId'
    | 'assembledMarkdown'
    | 'archivedAt'
    | 'rubric'
    | 'stepPlan'
>;
