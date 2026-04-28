export type ProjectColor = 'amber' | 'emerald' | 'sky' | 'rose' | 'violet' | 'slate' | 'orange' | 'teal';

/**
 * The kind of ministerial work this project represents. Drives the workspace's
 * roadmap (the guided sequence of phases shown to the pastor) and the default
 * suggestions for tutors, sources, and outputs. `general` is the catch-all
 * for free-form projects without a prescribed flow.
 */
export type ProjectType = 'sermon' | 'series' | 'counseling' | 'study' | 'general';

export interface AIProject {
    id: string;
    userId: string;
    title: string;
    color: ProjectColor;
    type?: ProjectType;
    icon?: string;
    /**
     * Short context injected by the orchestrator into every session within this project.
     * Example: "Serie sobre Romanos 1-8, congregación reformada de 80 personas, nivel teológico medio."
     */
    contextNote?: string;
    /**
     * IDs of library_resources the user has attached to this project as its
     * dedicated source set. When present, RAG retrieval inside the project's
     * sessions is scoped to these resources (NotebookLM-style).
     *
     * Empty / undefined → sessions fall back to the user's full personal library
     * (backwards-compatible behavior).
     */
    sourceIds?: string[];
    createdAt: Date;
    updatedAt: Date;
    /**
     * When set, the project is archived: hidden from the active projects list
     * and from dashboard "Proyectos activos", but still accessible via the
     * "Archivados" filter and direct URL. Null/undefined = active.
     */
    archivedAt?: Date;
    /**
     * Soft-delete marker. When set, the project lives in the user's "Papelera"
     * tab — recoverable via Restore. Permanent deletion (hard delete) only
     * happens when the user explicitly empties trash. Sessions, sermons, and
     * language sessions linked via `projectId` keep their links intact.
     */
    deletedAt?: Date;
}

/**
 * Output artifact produced within a project — a persistent piece of material
 * that the minister accumulates during the project's lifecycle (notes, drafts,
 * outlines, sermon manuscripts). Stored as markdown so it round-trips cleanly
 * with the chat rendering pipeline (citations, callouts, scripture refs, etc.).
 *
 * Persisted at: `users/{userId}/projects/{projectId}/outputs/{outputId}`.
 */
export type ProjectOutputKind = 'note' | 'draft' | 'outline' | 'sermon';

export interface ProjectOutput {
    id: string;
    projectId: string;
    userId: string;
    kind: ProjectOutputKind;
    title: string;
    /** Markdown content — may contain citations, scripture refs, Hebrew/Greek. */
    content: string;
    /** Optional snapshot of the sources referenced when this output was generated. */
    sources?: import('../services/IAIGeneratorService').SourceReference[];
    /** Session that produced this output (when applicable). */
    sessionId?: string;
    createdAt: Date;
    updatedAt: Date;
}
