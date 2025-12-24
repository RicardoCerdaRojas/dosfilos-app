import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@dosfilos/infrastructure';

/**
 * Dashboard metrics interface
 */
export interface DashboardMetrics {
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
    // Activity metrics
    totalSermonsCreated?: number;
    sermonsCreatedToday?: number;
    totalLogins?: number;
    totalGreekSessions?: number; // Greek Tutor study sessions
}

/**
 * Smart fallback to get user registration date
 * Handles 3 different registration flows:
 * 1. Email/Password signup: has createdAt from start
 * 2. Google + immediate payment: createdAt added by webhook (may be inaccurate)
 * 3. Google free: no createdAt, use other sources
 */
function getUserRegistrationDate(userData: any): Date | null {
    // Priority 1: createdAt in root (most reliable when set correctly)
    if (userData.createdAt) {
        return userData.createdAt.toDate();
    }

    // Priority 2: subscription.startDate (if they paid immediately after signup)
    // This is only reliable if startDate is within ~5 minutes of signup
    if (userData.subscription?.startDate) {
        const startDate = userData.subscription.startDate.toDate();
        // If they have both subscription and updatedAt, compare
        // If startDate is close to updatedAt, it's likely their registration date
        if (userData.updatedAt) {
            const updated = userData.updatedAt.toDate();
            const diffMinutes = Math.abs(startDate.getTime() - updated.getTime()) / 1000 / 60;
            // If subscription was created within 30 minutes of last update, use it
            if (diffMinutes <= 30) {
                return startDate;
            }
        } else {
            // No updatedAt, use startDate as best guess
            return startDate;
        }
    }

    // Priority 3: updatedAt as last resort (only for free users who never paid)
    // This will be their first login/update, close to registration
    if (!userData.subscription && userData.updatedAt) {
        return userData.updatedAt.toDate();
    }

    // No reliable date found
    return null;
}

/**
 * Hook to fetch and manage admin dashboard metrics
 * Uses daily_metrics collection for aggregated data
 */
export function useAdminMetrics() {
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                setLoading(true);

                // Try to get latest daily metrics
                const metricsQuery = query(
                    collection(db, 'daily_metrics'),
                    orderBy('date', 'desc'),
                    limit(2) // Get last 2 days for growth calculation
                );

                const metricsSnapshot = await getDocs(metricsQuery);

                if (!metricsSnapshot.empty) {
                    const latestDoc = metricsSnapshot.docs[0];
                    const latestData = latestDoc.data();

                    // Calculate growth rate if we have previous day
                    let growthRate = 0;
                    if (metricsSnapshot.docs.length > 1) {
                        const previousDoc = metricsSnapshot.docs[1];
                        const previousData = previousDoc.data();
                        const previousTotal = previousData.totalUsers || 0;
                        const currentTotal = latestData.totalUsers || 0;

                        if (previousTotal > 0) {
                            growthRate = ((currentTotal - previousTotal) / previousTotal) * 100;
                        }
                    }

                    setMetrics({
                        totalUsers: latestData.totalUsers || 0,
                        dau: latestData.dau || latestData.activeUsers || 0,
                        mau: latestData.mau || 0,
                        mrr: latestData.mrr || 0,
                        activeSubscriptions: latestData.usersByPlan || { free: 0, pro: 0, team: 0 },
                        newUsersToday: latestData.newUsers || 0,
                        growthRate
                    });
                } else {
                    // Fallback: Calculate metrics from users collection
                    // Fallback: calculate from all users
                    console.log('[useAdminMetrics] No daily_metrics found, calculating from users...');
                    const usersSnapshot = await getDocs(collection(db, 'users'));

                    // Count Greek Tutor sessions
                    const greekSessionsSnapshot = await getDocs(collection(db, 'greek_sessions'));
                    const totalGreekSessions = greekSessionsSnapshot.size;

                    let totalUsers = 0;
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    let newUsersToday = 0;
                    let usersWithDate = 0;
                    let usersWithoutDate = 0;
                    let mrr = 0;
                    const planCounts = { free: 0, pro: 0, team: 0 };

                    // Activity metrics
                    let totalSermonsCreated = 0;
                    let totalLogins = 0;

                    usersSnapshot.forEach((doc) => {
                        const userData = doc.data();
                        totalUsers++;

                        // Get registration date using smart fallback
                        const registrationDate = getUserRegistrationDate(userData);

                        if (registrationDate) {
                            usersWithDate++;
                            if (registrationDate >= today) {
                                newUsersToday++;
                                const source = userData.createdAt ? 'createdAt' :
                                    (userData.subscription?.startDate ? 'subscription.startDate' : 'updatedAt');
                                console.log('[useAdminMetrics] User registered today:', {
                                    email: userData.email,
                                    registrationDate: registrationDate,
                                    source: source
                                });
                            }
                        } else {
                            usersWithoutDate++;
                            console.warn('[useAdminMetrics] User without any date:', userData.email);
                        }

                        // Count by plan
                        const planId = userData.subscription?.planId || 'free';
                        if (planId === 'free') planCounts.free++;
                        else if (planId === 'pro') planCounts.pro++;
                        else if (planId === 'team') planCounts.team++;

                        // Calculate MRR (simplified)
                        if (userData.subscription?.status === 'active') {
                            // Assuming fixed prices for now
                            if (planId === 'pro') mrr += 10;
                            else if (planId === 'team') mrr += 25;
                        }

                        // Activity metrics from analytics field
                        if (userData.analytics) {
                            totalSermonsCreated += userData.analytics.sermonsCreated || 0;
                            totalLogins += userData.analytics.loginCount || 0;
                        }
                    });

                    console.log('[useAdminMetrics] New users today calculated:', newUsersToday);
                    console.log('[useAdminMetrics] Users with date:', usersWithDate);
                    console.log('[useAdminMetrics] Users without date:', usersWithoutDate);
                    console.log('[useAdminMetrics] Total Greek sessions:', totalGreekSessions);

                    setMetrics({
                        totalUsers,
                        dau: 0, // Can't calculate without activity data
                        mau: 0, // Can't calculate without activity data
                        mrr,
                        activeSubscriptions: planCounts,
                        newUsersToday,
                        growthRate: 0,
                        // Activity metrics
                        totalSermonsCreated,
                        sermonsCreatedToday: 0, // TODO: Calculate from today's user_activities
                        totalLogins,
                        totalGreekSessions,
                    });
                }

                setLoading(false);
            } catch (err) {
                console.error('Error fetching admin metrics:', err);
                setError(err instanceof Error ? err.message : 'Error al cargar métricas');
                setLoading(false);
            }
        };

        fetchMetrics();
    }, []);

    return { metrics, loading, error };
}
