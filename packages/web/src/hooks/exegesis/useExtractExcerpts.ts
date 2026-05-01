import { useMutation, useQueryClient } from '@tanstack/react-query';
import { exegesisService } from '@dosfilos/application';
import type { ExtractExcerptsSelection } from '@dosfilos/application';
import { useFirebase } from '@/context/firebase-context';

/**
 * React Query mutation that wraps `exegesisService.extractExcerpts`.
 *
 * Cache invalidation: same key the rest of the source mutations use
 * (`['exegesis', 'papers', userId]`) — sources live inline on the paper
 * doc, so any source change refreshes the whole paper subtree of cache.
 *
 * The mutation REJECTS with the raw error from the service so callers
 * can pattern-match on `ResourcesNotIndexedError` (instanceof check) and
 * surface a precise "prepare these resources first" panel. Don't catch
 * here — that would hide the typed error from consumers.
 */
export function useExtractExcerpts() {
    const { user } = useFirebase();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: {
            paperId: string;
            selections: ReadonlyArray<ExtractExcerptsSelection>;
            maxExcerptsPerResource?: number;
        }) => {
            if (!user?.uid) throw new Error('User not authenticated');
            return exegesisService.extractExcerpts.execute({
                ownerId: user.uid,
                paperId: input.paperId,
                selections: input.selections,
                maxExcerptsPerResource: input.maxExcerptsPerResource,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exegesis', 'papers', user?.uid] });
        },
    });
}
