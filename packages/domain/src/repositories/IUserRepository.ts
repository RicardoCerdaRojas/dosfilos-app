import { User, UserAnalytics } from '../entities/User';

/**
 * Filter options for user queries
 */
export interface UserFilters {
    planId?: string; // 'free', 'pro', 'team'
    status?: 'active' | 'cancelled' | 'suspended';
    engagementLevel?: 'low' | 'medium' | 'high';
    lastLoginBefore?: Date;
    lastLoginAfter?: Date;
    searchQuery?: string; // search by name or email
}

/**
 * Sort options for user queries
 */
export interface UserSortOptions {
    field: 'createdAt' | 'displayName' | 'engagementScore' | 'lastLoginAt';
    direction: 'asc' | 'desc';
}

/**
 * User repository interface for admin operations
 * Extends basic user operations with admin-specific capabilities
 */
export interface IUserRepository {
    /**
     * Get all users (admin only)
     */
    getAllUsers(filters?: UserFilters, sort?: UserSortOptions): Promise<User[]>;

    /**
     * Get a single user by ID
     */
    getUserById(userId: string): Promise<User | null>;

    /**
     * Get a user by email
     */
    getUserByEmail(email: string): Promise<User | null>;

    /**
     * Update user data
     */
    updateUser(userId: string, data: Partial<User>): Promise<void>;

    /**
     * Update user analytics
     */
    updateUserAnalytics(userId: string, analytics: Partial<UserAnalytics>): Promise<void>;

    /**
     * Get count of total users
     */
    getTotalUsersCount(): Promise<number>;

    /**
     * Get count of users by plan
     */
    getUsersByPlanCount(): Promise<{ free: number; pro: number; team: number }>;

    /**
     * Get users with high churn risk
     */
    getChurnRiskUsers(limit?: number): Promise<User[]>;

    /**
     * Increment a counter field in user analytics
     */
    incrementAnalyticsCounter(
        userId: string,
        field: keyof Pick<
            UserAnalytics,
            'loginCount' | 'sessionCount' | 'sermonsCreated' | 'sermonsGenerated' | 'greekTutorSessions' | 'libraryUploads'
        >,
        amount?: number
    ): Promise<void>;

    /**
     * Update user's last login timestamp
     */
    updateLastLogin(userId: string): Promise<void>;

    /**
     * Update user's last activity timestamp
     */
    updateLastActivity(userId: string): Promise<void>;
}
