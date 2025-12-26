import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@dosfilos/infrastructure';

export interface UserAnalytics {
    userId: string;
    sermons: {
        total: number;
        published: number;
        drafts: number;
    };
    greekSessions: {
        total: number;
        completed: number;
    };
    series: {
        total: number;
    };
    preachingPlans: {
        total: number;
    };
    logins: {
        total: number;
    };
}

/**
 * Hook to fetch user analytics from event-driven analytics collection
 * Reads from pre-aggregated user_analytics/{userId} document
 */
export function useUserAnalytics(userId: string | null) {
    const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);
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

                const analyticsRef = doc(db, `user_analytics/${userId}`);
                const analyticsSnap = await getDoc(analyticsRef);

                if (!analyticsSnap.exists()) {
                    // User doesn't have analytics yet (new user or before migration)
                    setAnalytics({
                        userId,
                        sermons: { total: 0, published: 0, drafts: 0 },
                        greekSessions: { total: 0, completed: 0 },
                        series: { total: 0 },
                        preachingPlans: { total: 0 },
                        logins: { total: 0 },
                    });
                    return;
                }

                const data = analyticsSnap.data();
                setAnalytics({
                    userId,
                    sermons: data.sermons || { total: 0, published: 0, drafts: 0 },
                    greekSessions: data.greekSessions || { total: 0, completed: 0 },
                    series: data.series || { total: 0 },
                    preachingPlans: data.preachingPlans || { total: 0 },
                    logins: data.logins || { total: 0 },
                });
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
