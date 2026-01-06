import { useState, useEffect } from 'react';
import { UserActivitySummary } from '@dosfilos/domain';
import { FirebaseUserActivityRepository, db } from '@dosfilos/infrastructure';

/**
 * Hook to fetch user activity summary for a specific user
 */
export function useUserActivitySummary(userId: string | null) {
    const [activity, setActivity] = useState<UserActivitySummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!userId) {
            setActivity(null);
            return;
        }

        const fetchActivity = async () => {
            setLoading(true);
            setError(null);

            try {
                const repo = new FirebaseUserActivityRepository(db);
                const result = await repo.getUserActivitySummary(userId);
                setActivity(result);
            } catch (err) {
                console.error('Error fetching user activity:', err);
                setError(err instanceof Error ? err.message : 'Error desconocido');
                setActivity(null);
            } finally {
                setLoading(false);
            }
        };

        fetchActivity();
    }, [userId]);

    return { activity, loading, error };
}
