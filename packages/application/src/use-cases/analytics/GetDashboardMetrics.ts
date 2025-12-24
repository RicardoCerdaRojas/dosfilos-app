import { DailyMetrics } from '@dosfilos/domain';

export interface DashboardMetricsDTO {
    totalUsers: number;
    dau: number; // Daily Active Users
    mau: number; // Monthly Active Users
    mrr: number; // Monthly Recurring Revenue
    activeSubscriptions: {
        free: number;
        pro: number;
        team: number;
    };
    newUsersToday: number;
    growthRate: number; // percentage
    trends?: {
        usersLastWeek: number[];
        revenueLastWeek: number[];
    };
}

export interface IAnalyticsRepository {
    getDailyMetrics(date: Date): Promise<DailyMetrics | null>;
    getLatestMetrics(): Promise<DailyMetrics | null>;
    getMetricsRange(startDate: Date, endDate: Date): Promise<DailyMetrics[]>;
}

/**
 * Use Case: Get Dashboard Metrics
 * 
 * Fetches key performance indicators for the admin dashboard.
 * Prioritizes pre-aggregated daily_metrics, falls back to real-time calculation.
 */
export class GetDashboardMetrics {
    constructor(private analyticsRepository: IAnalyticsRepository) { }

    async execute(): Promise<DashboardMetricsDTO> {
        // Try to get latest pre-aggregated metrics
        const latestMetrics = await this.analyticsRepository.getLatestMetrics();

        if (latestMetrics) {
            // We have aggregated data, use it
            return this.mapToDTO(latestMetrics);
        }

        // No aggregated data yet, return empty state
        // The fallback calculation is handled by the hook for now
        return {
            totalUsers: 0,
            dau: 0,
            mau: 0,
            mrr: 0,
            activeSubscriptions: { free: 0, pro: 0, team: 0 },
            newUsersToday: 0,
            growthRate: 0,
        };
    }

    /**
     * Get metrics with trend data for the last 7 days
     */
    async executeWithTrends(): Promise<DashboardMetricsDTO> {
        const today = new Date();
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

        const [latest, metricsRange] = await Promise.all([
            this.analyticsRepository.getLatestMetrics(),
            this.analyticsRepository.getMetricsRange(weekAgo, today),
        ]);

        if (!latest) {
            return {
                totalUsers: 0,
                dau: 0,
                mau: 0,
                mrr: 0,
                activeSubscriptions: { free: 0, pro: 0, team: 0 },
                newUsersToday: 0,
                growthRate: 0,
            };
        }

        const trends = {
            usersLastWeek: metricsRange.map(m => m.totalUsers),
            revenueLastWeek: metricsRange.map(m => m.mrr),
        };

        return {
            ...this.mapToDTO(latest),
            trends,
        };
    }

    private mapToDTO(metrics: DailyMetrics): DashboardMetricsDTO {
        return {
            totalUsers: metrics.totalUsers,
            dau: metrics.activeUsers,
            mau: 0, // TODO: Calculate MAU from user_activities
            mrr: metrics.mrr,
            activeSubscriptions: metrics.usersByPlan,
            newUsersToday: metrics.newUsers,
            growthRate: 0, // TODO: Calculate from previous period
        };
    }
}
