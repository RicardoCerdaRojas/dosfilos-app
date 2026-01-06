/**
 * Represents a single piece of content created by a user
 */
export interface ContentActivity {
    id: string;
    type: 'sermon' | 'greek_session' | 'series' | 'library_upload' | 'preaching_plan';
    title: string;
    createdAt: Date;
    status?: string;
}

/**
 * Comprehensive activity summary for a user
 * Aggregates all content creation and engagement metrics
 */
export interface UserActivitySummary {
    userId: string;
    userEmail: string;
    userDisplayName: string | null;
    userPhotoURL: string | null;

    // Content creation totals
    totalSermonsCreated: number;
    totalSermonsPublished: number;
    totalSermonsGenerated: number;      // AI-generated
    totalGreekSessions: number;
    totalGreekSessionsCompleted: number;
    totalSeriesCreated: number;
    totalLibraryUploads: number;
    totalPreachingPlans: number;

    // Actividad reciente
    contentCreatedToday: ContentActivity[];
    contentCreatedThisWeek: ContentActivity[];
    lastContentCreatedAt?: Date;

    // Engagement metrics
    engagementScore: number;
    riskLevel: 'low' | 'medium' | 'high';
    lastLoginAt: Date;
    lastActivityAt: Date;
    loginCount: number;

    // Subscription
    planId: string;
    subscriptionStatus: string;

    // Timestamps
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Filters for querying user activity summaries
 */
export interface UserActivityFilters {
    searchQuery?: string;
    planId?: string;
    status?: string;
    hasContentToday?: boolean;
    minEngagementScore?: number;
    maxEngagementScore?: number;
}
