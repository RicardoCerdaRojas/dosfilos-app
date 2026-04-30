import type { UserRubric, UserRubricDraft } from '../entities/UserRubric';

/**
 * Persistence contract for `UserRubric`. Mirrors
 * `IUserStyleGuideRepository` — top-level Firestore collection,
 * owner-scoped RLS, exactly-one default invariant maintained
 * transactionally.
 */
export interface IUserRubricRepository {
    listRubrics(ownerId: string): Promise<UserRubric[]>;

    /**
     * Returns the user's currently-default rubric, or null when
     * no template is marked default (which is the initial state
     * for a new user — they can mark one after creating their
     * first template).
     */
    getDefaultRubric(ownerId: string): Promise<UserRubric | null>;

    getRubric(ownerId: string, rubricId: string): Promise<UserRubric | null>;

    createRubric(draft: UserRubricDraft): Promise<UserRubric>;

    updateRubric(
        ownerId: string,
        rubricId: string,
        patch: Partial<Pick<UserRubric, 'displayName' | 'rubric'>>,
    ): Promise<UserRubric>;

    /**
     * Atomically promotes the given rubric to default and demotes
     * any other currently-default rubric for the same owner.
     */
    setDefault(ownerId: string, rubricId: string): Promise<UserRubric>;

    /**
     * Hard-delete. Implementations should reject when the rubric
     * is the user's only template AND it is the default (would
     * leave the user with no default), to surface the issue
     * instead of silently nulling the default. v1 accepts a
     * "no default" state so this isn't strictly required — but
     * worth flagging if the UI doesn't already gate the action.
     */
    deleteRubric(ownerId: string, rubricId: string): Promise<void>;
}
