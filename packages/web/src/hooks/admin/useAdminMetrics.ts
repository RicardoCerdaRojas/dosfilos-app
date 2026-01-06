import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@dosfilos/infrastructure';

/**
 * Dashboard metrics interface
 */
export interface DashboardMetrics {
    totalUsers: number;
    dau: number; // Daily Active Users
    mau: number; // Monthly Active Users
    mrr: number; // Monthly Recurring Revenue
    paidUsers: number; // Users with paid plans
    activeSubscriptions: {
        free: number;
        pro: number;
        team: number;
    };
    newUsersToday: number;
    growthRate: number; // percentage
    // Activity metrics
    totalSermonsCreated?: number;
    totalPublishedSermons?: number;
    totalDraftSermons?: number;
    sermonsCreatedToday?: number;
    totalLogins?: number;
    totalGreekSessions?: number; // Greek Tutor study sessions
    totalPreachingPlans?: number; // Preaching Plans
}

/**
 * Hook to fetch admin dashboard metrics from event-driven analytics
 * Reads from pre-aggregated collections:
 * - global_metrics/aggregate: Platform-wide totals
 * - global_metrics/daily/{date}: Daily metrics
 */
export function useAdminMetrics() {
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                setLoading(true);
                console.log('[useAdminMetrics] Fetching from event-driven analytics...');

                // Read from global_metrics/aggregate
                const aggregateRef = doc(db, 'global_metrics/aggregate');
                const aggregateSnap = await getDoc(aggregateRef);

                if (!aggregateSnap.exists()) {
                    console.warn('[useAdminMetrics] global_metrics/aggregate does not exist');
                    setMetrics(null);
                    setLoading(false);
                    return;
                }

                const aggregate = aggregateSnap.data();
                console.log('[useAdminMetrics] Aggregate data:', aggregate);

                // Get today's date string (YYYY-MM-DD)
                const today = new Date();
                const year = today.getFullYear();
                const month = String(today.getMonth() + 1).padStart(2, '0');
                const day = String(today.getDate()).padStart(2, '0');
                const todayString = `${year}-${month}-${day}`;

                // Read from global_metrics_daily collection (separate collection, not subcollection)
                const dailyRef = doc(db, 'global_metrics_daily', todayString);
                const dailySnap = await getDoc(dailyRef);

                const daily = dailySnap.exists() ? dailySnap.data() : null;
                console.log('[useAdminMetrics] Daily data:', daily);

                // Build metrics from aggregated data
                const dashboardMetrics: DashboardMetrics = {
                    // Users
                    totalUsers: aggregate.allTime?.users || 0,
                    dau: aggregate.currentMonth?.dau || 0,
                    mau: aggregate.currentMonth?.mau || 0,
                    paidUsers: aggregate.currentMonth?.paidUsers || daily?.users?.paidUsers || 0,
                    newUsersToday: daily?.users?.new || 0,

                    // Revenue
                    mrr: aggregate.currentMonth?.mrr || 0,

                    // Subscriptions (from daily)
                    activeSubscriptions: {
                        free: daily?.users?.byPlan?.free || 0,
                        pro: daily?.users?.byPlan?.pro || 0,
                        team: daily?.users?.byPlan?.team || 0,
                    },

                    // Activity metrics
                    totalSermonsCreated: aggregate.allTime?.sermons || 0,
                    totalPublishedSermons: aggregate.allTime?.published || 0,
                    totalDraftSermons: aggregate.allTime?.drafts || 0,
                    sermonsCreatedToday: daily?.sermons?.created || 0,
                    totalGreekSessions: aggregate.allTime?.greekSessions || 0,
                    totalPreachingPlans: aggregate.allTime?.series || 0, // series = planes de predicación
                    totalLogins: daily?.totalLogins || 0,

                    // Growth rate (placeholder - would need historical data)
                    growthRate: 0,
                };

                console.log('[useAdminMetrics] Dashboard metrics:', dashboardMetrics);
                setMetrics(dashboardMetrics);
                setError(null);

            } catch (err) {
                console.error('[useAdminMetrics] Error fetching metrics:', err);
                setError('Failed to load metrics');
                setMetrics(null);
            } finally {
                setLoading(false);
            }
        };

        fetchMetrics();
    }, []);

    return { metrics, loading, error };
}
