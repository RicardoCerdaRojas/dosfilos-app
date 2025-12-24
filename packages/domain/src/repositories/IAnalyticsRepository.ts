import { DailyMetrics } from '../entities/DailyMetrics';
import { UserActivity } from '../entities/UserActivity';

/**
 * Analytics repository interface
 * Manages analytics data persistence and retrieval
 */
export interface IAnalyticsRepository {
    /**
     * Track a user activity session
     */
    trackActivity(activity: UserActivity): Promise<void>;

    /**
     * Get user activities for a specific user
     */
    getUserActivities(userId: string, limit?: number): Promise<UserActivity[]>;

    /**
     * Get daily metrics for a specific date
     */
    getDailyMetrics(date: Date): Promise<DailyMetrics | null>;

    /**
     * Get daily metrics for a date range
     */
    getDailyMetricsRange(startDate: Date, endDate: Date): Promise<DailyMetrics[]>;

    /**
     * Save or update daily metrics
     */
    saveDailyMetrics(metrics: DailyMetrics): Promise<void>;

    /**
     * Get the latest N days of metrics
     */
    getLatestMetrics(days: number): Promise<DailyMetrics[]>;

    /**
     * Calculate Daily Active Users (DAU) for a specific date
     */
    calculateDAU(date: Date): Promise<number>;

    /**
     * Calculate Weekly Active Users (WAU) for a specific date
     */
    calculateWAU(date: Date): Promise<number>;

    /**
     * Calculate Monthly Active Users (MAU) for a specific date
     */
    calculateMAU(date: Date): Promise<number>;
}
