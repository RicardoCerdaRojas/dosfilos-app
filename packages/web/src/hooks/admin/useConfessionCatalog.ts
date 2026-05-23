import { useEffect, useState, useCallback } from 'react';
import { FirebaseConfessionRepository } from '@dosfilos/infrastructure';
import type { Confession, ConfessionSection } from '@dosfilos/domain';

const repo = new FirebaseConfessionRepository();

/**
 * Reads the CORE Library catalog for the admin viewer. Manual refetch is
 * exposed because the ingest callable mutates server-side and the admin
 * UI needs to surface fresh state after a re-run.
 */
export function useConfessionCatalog() {
    const [confessions, setConfessions] = useState<Confession[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const next = await repo.listConfessions();
            next.sort((a, b) => a.shortTitle.localeCompare(b.shortTitle));
            setConfessions(next);
            setError(null);
        } catch (err: any) {
            setError(err.message ?? 'Failed to load catalog');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return { confessions, loading, error, refresh };
}

export function useConfessionSections(confessionId: string | null) {
    const [sections, setSections] = useState<ConfessionSection[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [refreshTick, setRefreshTick] = useState(0);

    const refresh = useCallback(() => setRefreshTick((n) => n + 1), []);

    useEffect(() => {
        if (!confessionId) {
            setSections([]);
            return;
        }
        let cancelled = false;
        setLoading(true);
        repo.listSections(confessionId)
            .then((next) => { if (!cancelled) { setSections(next); setError(null); } })
            .catch((err) => { if (!cancelled) setError(err.message); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [confessionId, refreshTick]);

    return { sections, loading, error, refresh };
}
