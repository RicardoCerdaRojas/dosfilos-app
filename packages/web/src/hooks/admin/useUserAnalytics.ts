import { useState, useEffect } from 'react';
import { adminDashboardService, type AdminUserAnalytics } from '@dosfilos/application';

export type UserAnalytics = AdminUserAnalytics;

/**
 * Hook to fetch user analytics from the pre-aggregated
 * `user_analytics/{userId}` document. Firestore SDK lives in
 * `adminDashboardService.getUserAnalytics` so this hook stays a
 * thin presenter (compliance C7.3).
 */
export function useUserAnalytics(userId: string | null) {
    const [analytics, setAnalytics] = useState<AdminUserAnalytics | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!userId) {
            setAnalytics(null);
            return;
        }

        const fetchAnalytics = async () => {
            try {
                setLoading(true);
                const data = await adminDashboardService.getUserAnalytics(userId);
                setAnalytics(data);
                setError(null);
            } catch (err) {
                console.error('[useUserAnalytics] Error fetching analytics:', err);
                setError('Failed to load user analytics');
                setAnalytics(null);
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, [userId]);

    return { analytics, loading, error };
}
