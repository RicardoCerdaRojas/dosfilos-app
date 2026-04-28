import { useQuery } from '@tanstack/react-query';
import { useFirebase } from '@/context/firebase-context';
import { FirestoreGreekSessionRepository } from '@dosfilos/infrastructure';

const repo = new FirestoreGreekSessionRepository();

/**
 * Lightweight read-only hook for the dashboard.
 * Returns the user's Greek study sessions sorted by updatedAt desc.
 */
export function useGreekSessions() {
    const { user } = useFirebase();

    const { data, isLoading } = useQuery({
        queryKey: ['greek', 'sessions', user?.uid],
        queryFn: async () => {
            if (!user?.uid) return [];
            const sessions = await repo.getAllSessions(user.uid);
            return [...sessions].sort(
                (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
            );
        },
        enabled: !!user?.uid,
        staleTime: 60_000,
    });

    return {
        sessions: data ?? [],
        isLoading,
    };
}
