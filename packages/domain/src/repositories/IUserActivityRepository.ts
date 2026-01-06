import { UserActivitySummary, ContentActivity, UserActivityFilters } from '../entities/UserActivitySummary';

/**
 * Repository interface for user activity aggregation and queries
 * Provides methods to retrieve comprehensive activity data for users
 */
export interface IUserActivityRepository {
    /**
     * Get complete activity summary for a single user
     * Aggregates data from multiple collections (sermons, greek_tutor_sessions, etc.)
     */
    getUserActivitySummary(userId: string): Promise<UserActivitySummary | null>;

    /**
     * Get activity summaries for all users (admin view)
     * Supports filtering and pagination
     */
    getAllUsersActivitySummary(filters?: UserActivityFilters): Promise<UserActivitySummary[]>;

    /**
     * Get recent content created by a user within specified days
     */
    getRecentContent(userId: string, days: number): Promise<ContentActivity[]>;

    /**
     * Get all content of a specific type created by user
     */
    getUserContentByType(userId: string, type: ContentActivity['type']): Promise<ContentActivity[]>;

    /**
     * Update user analytics counters when new content is created
     * Called by event handlers/triggers
     */
    incrementContentCounter(
        userId: string,
        contentType: ContentActivity['type'],
        isPublished?: boolean
    ): Promise<void>;
}
