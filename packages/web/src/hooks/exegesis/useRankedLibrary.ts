import { useQuery } from '@tanstack/react-query';
import { exegesisService } from '@dosfilos/application';
import type { RankedResource } from '@dosfilos/domain';
import { useFirebase } from '@/context/firebase-context';

interface UseRankedLibraryOptions {
    paperId: string | null;
    /**
     * Whether to actually fire the ranking query. Caller passes
     * `dialogOpen` here so we don't pay the embedding cost on a
     * dialog that's not visible.
     */
    enabled: boolean;
}

interface UseRankedLibraryResult {
    /** Resources ranked by composite score, descending. Empty when nothing matched. */
    ranked: ReadonlyArray<RankedResource>;
    /** True while the ranking query is in flight. Drives the skeleton row in the dialog. */
    isLoading: boolean;
    /**
     * True when the ranker resolved AND returned an empty list. The
     * dialog uses this to show the "no smart matches — showing full
     * library" empty state instead of just the empty top section.
     */
    isEmptyAfterLoad: boolean;
}

/**
 * v1.7 paper-corpus smart-match. Fetches the user's library ranked by
 * semantic relevance to the paper's passage + brief.
 *
 * Cache key includes the paperId so re-opening the same dialog after
 * a brief edit triggers a fresh ranking; switching to a different
 * paper yields a separate cache entry. We don't include the brief
 * itself in the key — the paper repository invalidation flow already
 * fires the right invalidations when the brief changes.
 *
 * Returns empty + isLoading=false on auth-less / disabled state so
 * the consumer can render unconditionally.
 */
export function useRankedLibrary({ paperId, enabled }: UseRankedLibraryOptions): UseRankedLibraryResult {
    const { user } = useFirebase();

    const query = useQuery({
        queryKey: ['exegesis', 'libraryRanking', user?.uid, paperId],
        queryFn: async () => {
            if (!user?.uid || !paperId) return { ranked: [] as ReadonlyArray<RankedResource> };
            const result = await exegesisService.rankLibraryForPaper.execute({
                ownerId: user.uid,
                paperId,
            });
            return { ranked: result.ranked };
        },
        enabled: enabled && !!user?.uid && !!paperId,
        // Ranking is deterministic for a given (paper, library) pair —
        // cache for the dialog session. Re-open in the same browser
        // tab gets the cached result instantly.
        staleTime: 5 * 60 * 1000, // 5 min
    });

    const ranked = query.data?.ranked ?? [];
    return {
        ranked,
        isLoading: query.isLoading || query.isFetching,
        isEmptyAfterLoad: query.isFetched && ranked.length === 0,
    };
}
