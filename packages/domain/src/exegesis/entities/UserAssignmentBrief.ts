/**
 * A reusable assignment-brief template owned by a single user.
 *
 * Mirrors the `UserRubric` lifecycle: templates are FORKED to papers
 * (the paper's `assignmentBrief` is a plain string copy), so editing a
 * template later does not retroactively affect papers that were
 * already created from it.
 *
 * Storage: top-level collection `userAssignmentBriefs/{id}` with
 * `ownerId` field, parallel to `userRubrics`. Owner-only access via
 * Firestore rules.
 */
export interface UserAssignmentBrief {
    id: string;
    ownerId: string;

    /** Human label — "Hebreos cristológico", "Romanos justificación", "OT narrativo genérico". */
    displayName: string;

    /** Plain prose body — pasted into the paper's `assignmentBrief` field on apply. */
    body: string;

    /**
     * Whether this template auto-applies when the student creates a new
     * paper without picking a different one. Exactly one
     * `UserAssignmentBrief` per user is `isDefault: true` at any time
     * (enforced by the repo's `setDefault` transaction).
     */
    isDefault: boolean;

    createdAt: Date;
    updatedAt: Date;
}

/**
 * Draft shape for `createBrief` — id and timestamps assigned by the repo.
 */
export type UserAssignmentBriefDraft = Omit<UserAssignmentBrief, 'id' | 'createdAt' | 'updatedAt'>;

/** Hard ceiling matching the create wizard's textarea cap. */
export const ASSIGNMENT_BRIEF_MAX_CHARS = 2000;
