import { useQuery } from '@tanstack/react-query';
import { processingBalanceService } from '@dosfilos/application';
import { useFirebase } from '@/context/firebase-context';

/**
 * Reads the user's processing balance via React Query for cache + reuse
 * across multiple consumers (Library banner, exegesis hint pill, future
 * Faculty cost panel). Stale time is short — extractions decrement the
 * balance server-side and the user expects to see the updated number.
 */
export function usePageBalance() {
    const { user } = useFirebase();
    return useQuery({
        queryKey: ['processingBalance', user?.uid],
        queryFn: async () => {
            if (!user?.uid) return null;
            return processingBalanceService.getBalance(user.uid);
        },
        enabled: !!user?.uid,
        staleTime: 30_000,
    });
}
