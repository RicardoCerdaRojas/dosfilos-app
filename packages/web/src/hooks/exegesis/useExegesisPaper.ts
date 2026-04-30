import { useQuery } from '@tanstack/react-query';
import { exegesisService } from '@dosfilos/application';
import { useFirebase } from '@/context/firebase-context';

/**
 * Single-paper hook used by the detail and setup pages.
 *
 * Cache key matches the list (`['exegesis', 'papers', uid]`) plus the
 * paper id so list-level invalidations cascade automatically.
 * Returns `paper: null` when the id is missing or the user isn't
 * loaded — UI handles that with its own loading/empty branches.
 */
export function useExegesisPaper(paperId: string | undefined) {
    const { user } = useFirebase();
    const query = useQuery({
        queryKey: ['exegesis', 'papers', user?.uid, paperId],
        queryFn: async () => {
            if (!user?.uid) throw new Error('User not authenticated');
            if (!paperId) throw new Error('paperId is required');
            return exegesisService.getPaper.execute(user.uid, paperId);
        },
        enabled: !!user?.uid && !!paperId,
    });
    return {
        paper: query.data ?? null,
        isLoading: query.isLoading,
        error: query.error,
    };
}
