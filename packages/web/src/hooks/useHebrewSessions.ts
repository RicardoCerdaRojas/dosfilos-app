import { useQuery } from '@tanstack/react-query';
import { useFirebase } from '@/context/firebase-context';
import { FirestoreHebrewStudySessionRepository } from '@dosfilos/infrastructure';

const repo = new FirestoreHebrewStudySessionRepository();

/**
 * Read-only hook for the user's Hebrew study sessions, sorted by recent
 * activity. Records are persisted whenever the user analyzes a passage
 * via `recordHebrewActivity`.
 */
export function useHebrewSessions() {
    const { user } = useFirebase();

    const { data, isLoading } = useQuery({
        queryKey: ['hebrew', 'sessions', user?.uid],
        queryFn: async () => {
            if (!user?.uid) return [];
            const sessions = await repo.getAllByUser(user.uid);
            return [...sessions].sort(
                (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
            );
        },
        enabled: !!user?.uid,
        staleTime: 60_000,
    });

    return { sessions: data ?? [], isLoading };
}

export const hebrewStudySessionRepo = repo;
