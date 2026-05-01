import type {
    UserStyleGuide,
    UserStyleGuideDraft,
} from '../entities/UserStyleGuide';
import type { StyleGuideManifest } from '../entities/StyleGuideManifest';

/**
 * Persistence contract for `UserStyleGuide`. Stored under the user's
 * subcollection (`userStyleGuides/{ownerId}/{guideId}`) so listing and
 * authorization are scoped naturally.
 *
 * Active-guide invariant: at most one guide per user has `isActive: true`.
 * The repository is responsible for maintaining this — when the user
 * activates a different guide, the prior active one is automatically
 * deactivated in the same transaction.
 */
export interface IUserStyleGuideRepository {
    listGuides(ownerId: string): Promise<UserStyleGuide[]>;

    getActiveGuide(ownerId: string): Promise<UserStyleGuide | null>;

    getGuide(ownerId: string, guideId: string): Promise<UserStyleGuide | null>;

    createGuide(draft: UserStyleGuideDraft): Promise<UserStyleGuide>;

    updateGuide(
        ownerId: string,
        guideId: string,
        patch: Partial<Pick<UserStyleGuide, 'displayName' | 'version'>>
    ): Promise<UserStyleGuide>;

    /**
     * Atomically sets the given guide as active and deactivates any
     * other guide currently marked active for the same user.
     */
    setActive(ownerId: string, guideId: string): Promise<UserStyleGuide>;

    /**
     * Replaces the guide's `manifest` wholesale. Pass null to clear
     * (re-extracted later). The use case constructs the merged
     * manifest before calling — the repo just persists.
     */
    setManifest(
        ownerId: string,
        guideId: string,
        manifest: StyleGuideManifest | null,
    ): Promise<UserStyleGuide>;

    /**
     * Hard-delete. Implementations should reject if any non-archived
     * paper references this guide (papers must be migrated to a different
     * guide first), to avoid leaving papers in an inconsistent state.
     */
    deleteGuide(ownerId: string, guideId: string): Promise<void>;
}
