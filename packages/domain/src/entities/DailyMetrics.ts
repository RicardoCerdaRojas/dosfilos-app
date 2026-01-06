/**
 * Daily aggregated metrics entity
 * Stores pre-computed analytics data for efficient dashboard queries
 */
export interface DailyMetrics {
    id: string; // format: YYYY-MM-DD
    date: Date;

    // User metrics
    totalUsers: number;
    activeUsers: number; // DAU - Daily Active Users
    newUsers: number;

    // Engagement metrics
    totalSessions: number;
    avgSessionDuration: number; // in minutes
    totalSermonsCreated: number;
    totalAIGenerations: number;

    // Revenue metrics
    mrr: number; // Monthly Recurring Revenue
    newSubscriptions: number;
    cancelledSubscriptions: number;
    upgrades: number;
    downgrades: number;

    // Subscription distribution
    usersByPlan: {
        free: number;
        pro: number;
        team: number;
    };

    // Computed rolling metrics (calculated from last N days)
    dau: number; // same as activeUsers
    wau: number; // Weekly Active Users (last 7 days)
    mau: number; // Monthly Active Users (last 30 days)

    createdAt: Date;
    updatedAt: Date;
}

/**
 * Daily metrics entity class with factory method
 */
export class DailyMetricsEntity implements DailyMetrics {
    constructor(
        public id: string,
        public date: Date,
        public totalUsers: number,
        public activeUsers: number,
        public newUsers: number,
        public totalSessions: number,
        public avgSessionDuration: number,
        public totalSermonsCreated: number,
        public totalAIGenerations: number,
        public mrr: number,
        public newSubscriptions: number,
        public cancelledSubscriptions: number,
        public upgrades: number,
        public downgrades: number,
        public usersByPlan: { free: number; pro: number; team: number },
        public dau: number,
        public wau: number,
        public mau: number,
        public createdAt: Date,
        public updatedAt: Date
    ) { }

    static create(data: Partial<DailyMetrics> & { id: string; date: Date }): DailyMetricsEntity {
        const now = new Date();
        return new DailyMetricsEntity(
            data.id,
            data.date,
            data.totalUsers || 0,
            data.activeUsers || 0,
            data.newUsers || 0,
            data.totalSessions || 0,
            data.avgSessionDuration || 0,
            data.totalSermonsCreated || 0,
            data.totalAIGenerations || 0,
            data.mrr || 0,
            data.newSubscriptions || 0,
            data.cancelledSubscriptions || 0,
            data.upgrades || 0,
            data.downgrades || 0,
            data.usersByPlan || { free: 0, pro: 0, team: 0 },
            data.dau || data.activeUsers || 0,
            data.wau || 0,
            data.mau || 0,
            data.createdAt || now,
            data.updatedAt || now
        );
    }

    /**
     * Format date as YYYY-MM-DD for use as document ID
     */
    static formatDateId(date: Date): string {
        return date.toISOString().split('T')[0];
    }

    /**
     * Create a metrics entity for a specific date
     */
    static createForDate(date: Date, data: Partial<DailyMetrics> = {}): DailyMetricsEntity {
        return DailyMetricsEntity.create({
            ...data,
            id: DailyMetricsEntity.formatDateId(date),
            date,
        });
    }

    /**
     * Update the metrics (creates new instance)
     */
    update(updates: Partial<Omit<DailyMetrics, 'id' | 'date' | 'createdAt'>>): DailyMetricsEntity {
        return new DailyMetricsEntity(
            this.id,
            this.date,
            updates.totalUsers ?? this.totalUsers,
            updates.activeUsers ?? this.activeUsers,
            updates.newUsers ?? this.newUsers,
            updates.totalSessions ?? this.totalSessions,
            updates.avgSessionDuration ?? this.avgSessionDuration,
            updates.totalSermonsCreated ?? this.totalSermonsCreated,
            updates.totalAIGenerations ?? this.totalAIGenerations,
            updates.mrr ?? this.mrr,
            updates.newSubscriptions ?? this.newSubscriptions,
            updates.cancelledSubscriptions ?? this.cancelledSubscriptions,
            updates.upgrades ?? this.upgrades,
            updates.downgrades ?? this.downgrades,
            updates.usersByPlan ?? this.usersByPlan,
            updates.dau ?? this.dau,
            updates.wau ?? this.wau,
            updates.mau ?? this.mau,
            this.createdAt,
            new Date()
        );
    }
}
