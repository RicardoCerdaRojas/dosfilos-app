import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { libraryService } from '@dosfilos/application';
import {
    findLibraryResourceForRecommendation,
    type LibraryResourceLike,
    type SourceRecommendation,
} from '@dosfilos/domain';
import { useFirebase } from '@/context/firebase-context';

interface UseLibraryRecommendationMatchResult {
    /**
     * Returns the matched library resource for `rec`, or null when
     * none of the user's resources match. See domain helper
     * `matchRecommendationToResource` for the matching strategy.
     */
    findMatch: (rec: SourceRecommendation) => LibraryResourceLike | null;
    /** True while the library list is loading. Cards skip the badge until ready. */
    isLoading: boolean;
}

/**
 * v1.7.1 — Loads the user's library once + exposes a memoized matcher
 * the recommendation cards use to detect "you already have this".
 *
 * React Query handles dedup across multiple consumers — every card
 * that calls this hook shares the same library query under the key
 * `['library', 'userResources', uid, 'forRecommendations']`. Stale time
 * is generous because the catalog change frequency is low and the
 * matcher tolerates a slightly stale view.
 */
export function useLibraryRecommendationMatch(): UseLibraryRecommendationMatchResult {
    const { user } = useFirebase();

    const { data: resources = [], isLoading } = useQuery({
        queryKey: ['library', 'userResources', user?.uid, 'forRecommendations'],
        queryFn: async () => {
            if (!user?.uid) return [];
            return libraryService.getUserResources(user.uid);
        },
        enabled: !!user?.uid,
        // Library mutations elsewhere (upload / delete / edit metadata)
        // already invalidate the more-specific 'forExtraction' key.
        // We don't share that key on purpose — recommendations don't
        // need to flicker when the user is editing the library list.
        staleTime: 60_000,
    });

    const findMatch = useMemo(() => {
        return (rec: SourceRecommendation): LibraryResourceLike | null =>
            findLibraryResourceForRecommendation(rec, resources);
    }, [resources]);

    return { findMatch, isLoading };
}
