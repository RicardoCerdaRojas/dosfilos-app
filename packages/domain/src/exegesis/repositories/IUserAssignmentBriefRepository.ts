import type { UserAssignmentBrief, UserAssignmentBriefDraft } from '../entities/UserAssignmentBrief';

/**
 * Persistence contract for `UserAssignmentBrief`. Mirrors
 * `IUserRubricRepository` — top-level Firestore collection,
 * owner-scoped RLS, exactly-one default invariant maintained
 * transactionally.
 */
export interface IUserAssignmentBriefRepository {
    listBriefs(ownerId: string): Promise<UserAssignmentBrief[]>;

    getDefaultBrief(ownerId: string): Promise<UserAssignmentBrief | null>;

    getBrief(ownerId: string, briefId: string): Promise<UserAssignmentBrief | null>;

    createBrief(draft: UserAssignmentBriefDraft): Promise<UserAssignmentBrief>;

    updateBrief(
        ownerId: string,
        briefId: string,
        patch: Partial<Pick<UserAssignmentBrief, 'displayName' | 'body'>>,
    ): Promise<UserAssignmentBrief>;

    /**
     * Atomically promotes the given brief to default and demotes
     * any other currently-default brief for the same owner.
     */
    setDefault(ownerId: string, briefId: string): Promise<UserAssignmentBrief>;

    deleteBrief(ownerId: string, briefId: string): Promise<void>;
}
