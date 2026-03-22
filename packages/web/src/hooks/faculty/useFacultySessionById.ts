import { useQuery } from '@tanstack/react-query';
import { facultyService } from '@dosfilos/application';
import { useFirebase } from '@/context/firebase-context';

/**
 * Fetches a single faculty (tutor) session by its ID.
 * Used by StudySessionPanel in the sermon editor to display
 * the study session that originated the sermon.
 */
export function useFacultySessionById(sessionId: string | null | undefined) {
    const { user } = useFirebase();

    const query = useQuery({
        queryKey: ['faculty', 'session', user?.uid, sessionId],
        queryFn: async () => {
            if (!user?.uid || !sessionId) return null;
            return await facultyService.getSession.execute(user.uid, sessionId);
        },
        enabled: !!user?.uid && !!sessionId,
        staleTime: 5 * 60 * 1000, // 5 minutes – sessions don't change frequently
    });

    return {
        session: query.data ?? null,
        isLoading: query.isLoading,
        error: query.error,
    };
}
