/**
 * Type of artifact produced by the Faculty extraction tools. Mirrors the
 * union in ExtractTheologicalContentUseCase but lives in domain so other
 * layers (repo, UI, hooks) can reference it without dragging the use-case
 * file.
 *
 * SERMON_OUTLINE is the preview/draft variant that opens the wizard;
 * SERMON is the fully-rendered sermon document. Both are persisted as
 * Extraction docs but the SERMON case also carries an externalRef back
 * to the canonical `sermons/{id}` document.
 */
export type ExtractionType =
    | 'SERMON'
    | 'SERMON_OUTLINE'
    | 'BIBLE_STUDY'
    | 'COUNSELING_TASK'
    | 'NEWSLETTER'
    | 'SYSTEMATIC_THEOLOGY_PAPER'
    | 'BLOG_POST'
    | 'DEVOTIONAL';

/**
 * Optional pointer from an Extraction to a canonical record in another
 * collection. Used today only for `SERMON` (links to `sermons/{id}`),
 * but generalized so future types can hook into specialized stores
 * (e.g. `SYSTEMATIC_THEOLOGY_PAPER` → `exegeticalPapers/{id}`).
 */
export interface ExtractionExternalRef {
    collection: 'sermons' | 'exegeticalPapers';
    id: string;
}

/**
 * A persisted artifact derived from a Faculty conversation. The
 * conversation itself stays in `users/{userId}/ai_sessions/{sessionId}`;
 * an Extraction crystallizes a slice of that conversation into a
 * structured document the user can return to, edit, pin, and publish.
 *
 * Lifecycle:
 *   - Created when a user clicks one of the extraction tools and the
 *     LLM call succeeds. The Cloud Function writes the doc.
 *   - User can edit `markdown` via the document editor (co-author
 *     micro-actions). Each save bumps `version`.
 *   - `projectId` is set when the user pins the artifact to a project
 *     (cross-session reuse).
 *   - When the source session is deleted, `sessionId` is nulled (orphan
 *     pattern) — the artifact survives as a valuable output.
 *   - When the pinned project is deleted, `projectId` is nulled (same
 *     orphan pattern projects already use for sessions).
 *
 * `derivedFromMessageIds` is a snapshot taken at extraction time of the
 * message IDs that were the source. It survives later edits/deletions
 * of those messages — provenance UI degrades gracefully when refs
 * no longer resolve.
 */
export interface Extraction {
    id: string;
    userId: string;
    /** Null when the source session has been deleted (orphan). */
    sessionId: string | null;
    /** Set when the user pins this artifact to a project. */
    projectId: string | null;
    type: ExtractionType;
    title: string;
    markdown: string;
    createdAt: Date;
    updatedAt: Date;
    /**
     * IDs of the chat messages that existed when this extraction was
     * generated. Used by the "Ver origen" affordance to jump back to
     * the source turns and highlight them.
     */
    derivedFromMessageIds: string[];
    /** Set when the artifact has a canonical mirror in another collection. */
    externalRef: ExtractionExternalRef | null;
    /** Incremented on each material edit to the markdown body. */
    version: number;
    /**
     * Set when the source session was deleted after this artifact was
     * created. Drives a UX hint ("Origen no disponible — sesión eliminada").
     * The doc itself is preserved.
     */
    sourceSessionDeleted?: boolean;
}
