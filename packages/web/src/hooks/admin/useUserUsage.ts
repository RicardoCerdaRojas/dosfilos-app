import { useEffect, useState } from 'react';
import { adminDashboardService, type AdminUserUsageSnapshot } from '@dosfilos/application';

/**
 * Reads the current-period usage_counters doc for a user plus their
 * plan definition (so we can render "X of Y" + percentage progress).
 *
 * Not realtime: a single read pair on mount + when planId changes.
 * Usage counters update server-side and the admin doesn't need
 * second-by-second accuracy here — refresh-on-demand is enough.
 *
 * Firestore SDK lives in `adminDashboardService.getUserUsageSnapshot`
 * so this hook stays a thin presenter (compliance C7.3).
 */
export function useUserUsage(userId: string | undefined, planId: string | undefined) {
    const [data, setData] = useState<AdminUserUsageSnapshot | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!userId) {
            setData(null);
            setLoading(false);
            return;
        }

        let cancelled = false;
        const fetch = async () => {
            setLoading(true);
            try {
                const snapshot = await adminDashboardService.getUserUsageSnapshot(userId, planId);
                if (cancelled) return;
                setData(snapshot);
                setError(null);
            } catch (err) {
                if (cancelled) return;
                console.error('[useUserUsage]', err);
                setError(err instanceof Error ? err.message : 'unknown');
                setData(null);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetch();
        return () => { cancelled = true; };
    }, [userId, planId]);

    return { data, loading, error };
}
