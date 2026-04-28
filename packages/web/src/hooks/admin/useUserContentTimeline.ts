import { useEffect, useState } from 'react';
import type { ContentActivity } from '@dosfilos/domain';
import { FirebaseUserActivityRepository, db } from '@dosfilos/infrastructure';

/**
 * Fetches the user's content timeline over the last `days` days. Reuses the
 * activity repo's getRecentContent helper which already aggregates across
 * sermons, tutors, faculty, projects, library and plans in parallel.
 */
export function useUserContentTimeline(userId: string | undefined, days: number) {
    const [items, setItems] = useState<ContentActivity[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!userId) {
            setItems([]);
            setLoading(false);
            return;
        }
        let cancelled = false;
        const repo = new FirebaseUserActivityRepository(db);
        setLoading(true);
        repo.getRecentContent(userId, days)
            .then((result) => { if (!cancelled) { setItems(result); setError(null); } })
            .catch((err) => {
                if (cancelled) return;
                console.error('[useUserContentTimeline]', err);
                setError(err instanceof Error ? err.message : 'unknown');
                setItems([]);
            })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [userId, days]);

    return { items, loading, error };
}
