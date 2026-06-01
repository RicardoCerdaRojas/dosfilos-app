import { useState, useEffect, useCallback, useRef } from 'react';
import { StudySession, SessionsPage } from '@dosfilos/domain';

interface UseSessionListProps {
    userId: string;
    /** Paginated fetcher (createdAt DESC). One page per call. */
    getSessionsPage: (userId: string, pageSize: number, cursorCreatedAt?: Date) => Promise<SessionsPage>;
    /** Sessions per page. */
    pageSize?: number;
}

/**
 * Hook for the Greek dashboard session list.
 *
 * Loads sessions one page at a time (createdAt DESC) instead of pulling every
 * full session doc up front — the previous behaviour made the dashboard slow
 * to open for users with many sessions. The dashboard applies its own
 * client-side search / progress filter / sort over the accumulated pages, so
 * filtering operates on what has been loaded (the "Cargar más" button extends
 * the set).
 */
export const useSessionList = ({ userId, getSessionsPage, pageSize = 12 }: UseSessionListProps) => {
    const [sessions, setSessions] = useState<StudySession[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const cursorRef = useRef<Date | undefined>(undefined);

    // Keep the fetcher in a ref so callbacks don't depend on its identity.
    // The dashboard passes an inline arrow (new reference every render); without
    // this, `loadFirstPage` would change each render and the mount effect would
    // re-run in a loop ("Cargando sesiones…" flicker).
    const getSessionsPageRef = useRef(getSessionsPage);
    getSessionsPageRef.current = getSessionsPage;

    const loadFirstPage = useCallback(async () => {
        if (!userId) return;
        setIsLoading(true);
        setError(null);
        cursorRef.current = undefined;
        try {
            const page = await getSessionsPageRef.current(userId, pageSize);
            setSessions(page.sessions);
            setHasMore(page.hasMore);
            cursorRef.current = page.nextCursor;
        } catch (err) {
            console.error('[useSessionList] Error fetching sessions:', err);
            setError(err instanceof Error ? err.message : 'Error al cargar sesiones');
        } finally {
            setIsLoading(false);
        }
    }, [userId, pageSize]);

    const loadMore = useCallback(async () => {
        if (!userId || !hasMore || isLoadingMore) return;
        setIsLoadingMore(true);
        try {
            const page = await getSessionsPageRef.current(userId, pageSize, cursorRef.current);
            setSessions(prev => [...prev, ...page.sessions]);
            setHasMore(page.hasMore);
            cursorRef.current = page.nextCursor;
        } catch (err) {
            console.error('[useSessionList] Error loading more sessions:', err);
            setError(err instanceof Error ? err.message : 'Error al cargar más sesiones');
        } finally {
            setIsLoadingMore(false);
        }
    }, [userId, hasMore, isLoadingMore, pageSize]);

    // Initial load (resets pagination) on mount / user change.
    useEffect(() => {
        loadFirstPage();
    }, [loadFirstPage]);

    return {
        sessions,
        isLoading,
        isLoadingMore,
        hasMore,
        error,
        loadMore,
        /** Reloads from the first page (used after delete / cleanup). */
        refetch: loadFirstPage,
    };
};
