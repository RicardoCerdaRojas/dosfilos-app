/**
 * HebrewStudySession — per-user record of a Hebrew passage analysis activity.
 *
 * Why this exists:
 *  - The global `hebrew_analysis_cache` collection stores the linguistic
 *    analysis of a verse so it can be reused across users. That cache is
 *    not user-scoped.
 *  - For the project-first paradigm, the user needs their OWN trail of
 *    Hebrew study activities — what they analyzed, when, and inside which
 *    project. That's this entity.
 *
 * Stored at: `hebrew_user_sessions/{sessionId}` (per-user via where(userId)).
 * Idempotent on (userId, passage): if the user re-analyzes the same passage,
 * the existing session is touched (updatedAt bumped) instead of duplicated.
 */
export interface HebrewStudySession {
    id: string;
    userId: string;
    /** e.g., "Genesis 1:1" — same string format as hebrew_analysis_cache reference. */
    passage: string;
    createdAt: Date;
    updatedAt: Date;
    /** Optional link to a project workspace (NotebookLM-style). */
    projectId?: string;
}
