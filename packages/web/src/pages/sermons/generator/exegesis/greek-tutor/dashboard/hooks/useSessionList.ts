import { useState, useEffect } from 'react';
import { StudySession } from '@dosfilos/domain';
import { SessionFilters } from '@dosfilos/application/src/greek-tutor/use-cases/GetUserSessionsUseCase';

interface UseSessionListProps {
    userId: string;
    getUserSessions: (userId: string, filters?: SessionFilters) => Promise<StudySession[]>;
}

/**
 * Hook for managing session list state and filtering
 */
export const useSessionList = ({ userId, getUserSessions }: UseSessionListProps) => {
    const [sessions, setSessions] = useState<StudySession[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filters, setFilters] = useState<SessionFilters>({});

    /**
     * Fetch sessions from repository
     */
    const fetchSessions = async () => {
        if (!userId) return;

        setIsLoading(true);
        setError(null);

        try {
            const fetchedSessions = await getUserSessions(userId, filters);
            setSessions(fetchedSessions);
        } catch (err) {
            console.error('[useSessionList] Error fetching sessions:', err);
            setError(err instanceof Error ? err.message : 'Error al cargar sesiones');
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Refetch sessions (useful after delete/update)
     */
    const refetch = () => {
        fetchSessions();
    };

    /**
     * Update filters and refetch
     */
    const updateFilters = (newFilters: SessionFilters) => {
        setFilters(newFilters);
    };

    // Initial fetch and refetch on filter changes
    useEffect(() => {
        fetchSessions();
    }, [userId, filters]);

    return {
        sessions,
        isLoading,
        error,
        filters,
        updateFilters,
        refetch
    };
};
