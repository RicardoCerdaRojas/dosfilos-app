/**
 * Engagement Score Calculator
 * 
 * Calculates user engagement score (0-100) based on various activity metrics.
 * Higher score = more engaged user.
 */

export interface UserAnalytics {
    loginCount?: number;
    lastLoginAt?: Date;
    sermonsCreated?: number;
    lastActivityAt?: Date;
    greekSessionsCreated?: number;
}

export interface EngagementFactors {
    loginFrequency: number;      // 0-30 points
    recency: number;              // 0-20 points
    sermonCreation: number;       // 0-30 points
    greekTutorUsage: number;      // 0-10 points
    consistency: number;          // 0-10 points
}

/**
 * Calculate engagement score (0-100)
 */
export function calculateEngagementScore(analytics?: UserAnalytics): number {
    if (!analytics) return 0;

    const factors = calculateEngagementFactors(analytics);

    const totalScore =
        factors.loginFrequency +
        factors.recency +
        factors.sermonCreation +
        factors.greekTutorUsage +
        factors.consistency;

    return Math.min(100, Math.max(0, Math.round(totalScore)));
}

/**
 * Calculate individual engagement factors
 */
export function calculateEngagementFactors(analytics: UserAnalytics): EngagementFactors {
    return {
        loginFrequency: calculateLoginFrequencyScore(analytics.loginCount || 0),
        recency: calculateRecencyScore(analytics.lastActivityAt || analytics.lastLoginAt),
        sermonCreation: calculateSermonCreationScore(analytics.sermonsCreated || 0),
        greekTutorUsage: calculateGreekTutorScore(analytics.greekSessionsCreated || 0),
        consistency: calculateConsistencyScore(analytics),
    };
}

/**
 * Login frequency score (0-30 points)
 * More logins = higher engagement
 */
function calculateLoginFrequencyScore(loginCount: number): number {
    if (loginCount === 0) return 0;
    if (loginCount < 5) return 5;
    if (loginCount < 10) return 10;
    if (loginCount < 20) return 15;
    if (loginCount < 50) return 20;
    if (loginCount < 100) return 25;
    return 30;
}

/**
 * Recency score (0-20 points)
 * More recent activity = higher engagement
 */
function calculateRecencyScore(lastActivityDate?: Date): number {
    if (!lastActivityDate) return 0;

    const now = new Date();
    const diffMs = now.getTime() - lastActivityDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffDays <= 1) return 20;      // Active today or yesterday
    if (diffDays <= 3) return 15;      // Active in last 3 days
    if (diffDays <= 7) return 10;      // Active in last week
    if (diffDays <= 14) return 5;      // Active in last 2 weeks
    if (diffDays <= 30) return 2;      // Active in last month
    return 0;                           // Inactive for over a month
}

/**
 * Sermon creation score (0-30 points)
 * More sermons = higher engagement with core feature
 */
function calculateSermonCreationScore(sermonsCreated: number): number {
    if (sermonsCreated === 0) return 0;
    if (sermonsCreated === 1) return 10;
    if (sermonsCreated < 5) return 15;
    if (sermonsCreated < 10) return 20;
    if (sermonsCreated < 20) return 25;
    return 30;
}

/**
 * Greek Tutor usage score (0-10 points)
 * Using Greek Tutor = engaged with advanced features
 */
function calculateGreekTutorScore(sessionsCreated: number): number {
    if (sessionsCreated === 0) return 0;
    if (sessionsCreated === 1) return 3;
    if (sessionsCreated < 5) return 5;
    if (sessionsCreated < 10) return 7;
    return 10;
}

/**
 * Consistency score (0-10 points)
 * Bonus for consistent activity patterns
 */
function calculateConsistencyScore(analytics: UserAnalytics): number {
    const loginCount = analytics.loginCount || 0;
    const sermonsCreated = analytics.sermonsCreated || 0;

    // User with multiple logins and sermons = consistent
    if (loginCount >= 10 && sermonsCreated >= 5) return 10;
    if (loginCount >= 5 && sermonsCreated >= 3) return 7;
    if (loginCount >= 3 && sermonsCreated >= 1) return 5;

    return 0;
}

/**
 * Get engagement level label
 */
export function getEngagementLevel(score: number): 'high' | 'medium' | 'low' | 'inactive' {
    if (score >= 70) return 'high';
    if (score >= 40) return 'medium';
    if (score >= 10) return 'low';
    return 'inactive';
}

/**
 * Get engagement level color for UI
 */
export function getEngagementColor(score: number): string {
    const level = getEngagementLevel(score);
    switch (level) {
        case 'high': return 'green';
        case 'medium': return 'yellow';
        case 'low': return 'orange';
        case 'inactive': return 'gray';
    }
}
