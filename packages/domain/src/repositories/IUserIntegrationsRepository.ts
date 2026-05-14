import { WordpressIntegration } from '../entities/WordpressIntegration';

/**
 * Repository for per-user 3rd-party integration credentials. Each
 * integration lives at `users/{userId}/integrations/{provider}` so
 * queries are user-scoped and Firestore rules can lock down access
 * to the owning user.
 */
export interface IUserIntegrationsRepository {
    getWordpress(userId: string): Promise<WordpressIntegration | null>;
    /** Sets or replaces the WordPress config. Server stamps connectedAt. */
    saveWordpress(userId: string, config: Omit<WordpressIntegration, 'connectedAt' | 'lastPublishedAt' | 'lastError'>): Promise<void>;
    /** Removes the WordPress integration entirely (revoke). */
    deleteWordpress(userId: string): Promise<void>;
    /** Records the last successful publish timestamp. */
    markWordpressPublished(userId: string): Promise<void>;
    /** Records an error from the most recent publish attempt. */
    markWordpressError(userId: string, error: string): Promise<void>;
}
