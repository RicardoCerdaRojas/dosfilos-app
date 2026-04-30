import type {
    ExegeticalPaper,
    ExegeticalPaperDraft,
    ExegeticalPaperPhase,
} from '../entities/ExegeticalPaper';
import type {
    ExegeticalStep,
    ExegeticalStepState,
    ExegeticalStepVersion,
} from '../entities/ExegeticalStep';
import type { ProjectSource } from '../entities/ProjectSource';

/**
 * Persistence contract for `ExegeticalPaper` and its child entities (steps
 * and project sources). Modeled as a single repository because the entities
 * are tightly coupled — a paper without its steps is meaningless — and
 * Firestore's nested-collection model lets us implement this efficiently
 * with subcollections (`exegeticalPapers/{paperId}/steps/{stepId}`).
 *
 * The implementation is expected to enforce ownership: every method that
 * accepts an `ownerId` must reject access to documents the user doesn't
 * own. Methods that don't take an `ownerId` are scoped by the `paperId`
 * which the caller already authorized via a prior `getPaper(...)` call.
 *
 * Concurrency: step updates should be transactional when multiple fields
 * mutate together (e.g. accepting a new version flips state, sets
 * `accepted`, and updates `updatedAt`). The interface doesn't prescribe
 * a transaction primitive — implementations choose.
 */
export interface IExegeticalPaperRepository {
    // ── Papers ────────────────────────────────────────────────────────────

    /** All papers owned by the user, ordered by `updatedAt` desc. Excludes archived. */
    listPapers(ownerId: string): Promise<ExegeticalPaper[]>;

    /** Includes archived papers. Used by the "Trash" view. */
    listAllPapers(ownerId: string): Promise<ExegeticalPaper[]>;

    /** Returns null when the paper doesn't exist or doesn't belong to the user. */
    getPaper(ownerId: string, paperId: string): Promise<ExegeticalPaper | null>;

    /**
     * Creates a paper in `phase: 'configuring'` with an empty `steps` array.
     * Steps are spawned by `seedStepsForPassage` once the user finalizes
     * configuration, not at create time — keeping create cheap and letting
     * the user adjust the passage before commitment.
     */
    createPaper(draft: ExegeticalPaperDraft): Promise<ExegeticalPaper>;

    /**
     * Patch a subset of paper fields. The interface is intentionally
     * narrow — most state changes go through dedicated methods (sources,
     * steps) so the implementation can keep the model consistent.
     */
    updatePaper(
        ownerId: string,
        paperId: string,
        patch: Partial<Pick<ExegeticalPaper, 'title' | 'displayLanguage' | 'styleGuideId' | 'currentStepId' | 'assembledMarkdown'>>
    ): Promise<ExegeticalPaper>;

    /** Transitions phase. Implementations validate legal transitions. */
    setPhase(ownerId: string, paperId: string, phase: ExegeticalPaperPhase): Promise<ExegeticalPaper>;

    /** Soft-delete (sets `archivedAt`). Reversible via `unarchivePaper`. */
    archivePaper(ownerId: string, paperId: string): Promise<ExegeticalPaper>;
    unarchivePaper(ownerId: string, paperId: string): Promise<ExegeticalPaper>;

    /**
     * Hard-delete: removes the paper, all steps, and all project sources.
     * The corpus chunks remain (they may belong to the user's library if
     * promoted). Irreversible — guard at the use-case level.
     */
    hardDeletePaper(ownerId: string, paperId: string): Promise<void>;

    // ── Sources ───────────────────────────────────────────────────────────

    addSource(
        ownerId: string,
        paperId: string,
        source: Omit<ProjectSource, 'id' | 'paperId' | 'createdAt'>
    ): Promise<ProjectSource>;

    updateSource(
        ownerId: string,
        paperId: string,
        sourceId: string,
        patch: Partial<Pick<ProjectSource, 'sourceType' | 'displayLabel' | 'citationKey' | 'order'>>
    ): Promise<ProjectSource>;

    removeSource(ownerId: string, paperId: string, sourceId: string): Promise<void>;

    // ── Steps ─────────────────────────────────────────────────────────────

    /**
     * Creates the initial step list for the paper from its `passage`:
     * one step per verse in range, plus conclusion, introduction, and
     * assembly. Idempotent — calling twice on the same paper does NOT
     * duplicate steps; if any step already exists, this is a no-op.
     *
     * Returns the resulting step list (existing or newly seeded) so the
     * caller can navigate the user to step #1.
     */
    seedStepsForPassage(ownerId: string, paperId: string): Promise<ExegeticalStep[]>;

    setStepState(
        ownerId: string,
        paperId: string,
        stepId: string,
        state: ExegeticalStepState
    ): Promise<ExegeticalStep>;

    /**
     * Appends a new version to the step's history and sets `current` to
     * point at it. Does NOT change `accepted` — that requires explicit
     * acceptance via `acceptStepVersion`.
     */
    appendStepVersion(
        ownerId: string,
        paperId: string,
        stepId: string,
        version: Omit<ExegeticalStepVersion, 'id' | 'createdAt'>
    ): Promise<ExegeticalStepVersion>;

    /**
     * Marks a previously-appended version as the accepted one. Sets
     * `state: 'accepted'` and points `accepted` at the version.
     */
    acceptStepVersion(
        ownerId: string,
        paperId: string,
        stepId: string,
        versionId: string
    ): Promise<ExegeticalStep>;

    /**
     * Records a manual edit by the user. Internally creates a version
     * with `origin: 'edited'`, parented to whatever was previously
     * accepted, and sets that as the new `accepted`. Does not change
     * `state` (stays 'accepted') and does not re-run verification — the
     * UI must re-trigger that explicitly per the user's request.
     */
    saveManualEdit(
        ownerId: string,
        paperId: string,
        stepId: string,
        markdown: string
    ): Promise<ExegeticalStep>;
}
