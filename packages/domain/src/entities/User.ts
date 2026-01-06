import { Subscription } from './Subscription';

/**
 * User role enumeration
 */
export type UserRole = 'user' | 'super_admin';

/**
 * User analytics tracking data
 */
export interface UserAnalytics {
    // Activity metrics
    lastLoginAt: Date;
    lastActivityAt: Date;
    loginCount: number;
    sessionCount: number;
    totalSessionDuration: number; // in minutes

    // Feature usage - Content counters
    sermonsCreated: number;
    sermonsPublished: number;        // NEW: Only published sermons
    sermonsGenerated: number;        // AI-generated sermons
    greekTutorSessions: number;
    greekTutorCompleted: number;     // NEW: Completed sessions
    libraryUploads: number;
    seriesCreated: number;           // NEW: Sermon series
    preachingPlansCreated: number;   // NEW: Preaching plans

    // Important timestamps
    firstSermonAt?: Date;
    firstAIGenerationAt?: Date;
    lastContentCreatedAt?: Date;     // NEW: Last content creation

    // Daily activity tracking (resets daily)
    contentCreatedToday: number;     // NEW: Counter for today's content
    contentCreatedThisWeek: number;  // NEW: Counter for this week's content

    // Engagement metrics (computed)
    engagementScore: number; // 0-100
    riskLevel: 'low' | 'medium' | 'high'; // Churn risk
}

/**
 * User metadata for tracking source and context
 */
export interface UserMetadata {
    source: 'organic' | 'referral' | 'campaign';
    referralCode?: string;
    utmParams?: Record<string, string>;
    deviceInfo?: {
        platform: string;
        browser: string;
    };
}

export interface User {
    id: string;
    email: string;
    displayName: string | null;
    photoURL: string | null;

    // Role (for admin access)
    role?: UserRole;

    // Subscription fields
    stripeCustomerId?: string;    // Stripe customer ID (at root level)
    subscription?: Subscription;  // Current subscription details

    // Analytics & Engagement
    analytics?: UserAnalytics;

    // Metadata
    metadata?: UserMetadata;

    createdAt: Date;
    updatedAt: Date;
}

export class UserEntity implements User {
    constructor(
        public id: string,
        public email: string,
        public displayName: string | null = null,
        public photoURL: string | null = null,
        public stripeCustomerId?: string,
        public subscription?: Subscription,
        public role?: UserRole,
        public analytics?: UserAnalytics,
        public metadata?: UserMetadata,
        public createdAt: Date = new Date(),
        public updatedAt: Date = new Date()
    ) { }

    static create(data: Partial<User> & { id: string; email: string }): UserEntity {
        return new UserEntity(
            data.id,
            data.email,
            data.displayName ?? null,
            data.photoURL ?? null,
            data.stripeCustomerId,
            data.subscription,
            data.role,
            data.analytics,
            data.metadata,
            data.createdAt ?? new Date(),
            data.updatedAt ?? new Date()
        );
    }

    updateProfile(displayName: string, photoURL?: string): UserEntity {
        return new UserEntity(
            this.id,
            this.email,
            displayName,
            photoURL ?? this.photoURL,
            this.stripeCustomerId,
            this.subscription,
            this.role,
            this.analytics,
            this.metadata,
            this.createdAt,
            new Date()
        );
    }

    /**
     * Update user analytics data
     */
    updateAnalytics(analytics: Partial<UserAnalytics>): UserEntity {
        return new UserEntity(
            this.id,
            this.email,
            this.displayName,
            this.photoURL,
            this.stripeCustomerId,
            this.subscription,
            this.role,
            { ...this.analytics, ...analytics } as UserAnalytics,
            this.metadata,
            this.createdAt,
            new Date()
        );
    }

    /**
     * Check if user is super admin
     */
    isSuperAdmin(): boolean {
        return this.role === 'super_admin';
    }

    /**
     * Initialize default analytics for new users
     */
    static initializeAnalytics(): UserAnalytics {
        const now = new Date();
        return {
            lastLoginAt: now,
            lastActivityAt: now,
            loginCount: 0,
            sessionCount: 0,
            totalSessionDuration: 0,
            sermonsCreated: 0,
            sermonsPublished: 0,
            sermonsGenerated: 0,
            greekTutorSessions: 0,
            greekTutorCompleted: 0,
            libraryUploads: 0,
            seriesCreated: 0,
            preachingPlansCreated: 0,
            contentCreatedToday: 0,
            contentCreatedThisWeek: 0,
            engagementScore: 0,
            riskLevel: 'low',
        };
    }
}

