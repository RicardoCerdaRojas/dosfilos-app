import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { libraryService } from '@dosfilos/application';
import type { LibraryResourceEntity } from '@dosfilos/domain';
import { useFirebase } from '@/context/firebase-context';
import { libraryQueryKey } from './useLibrary';

/**
 * Mounts ONE Firestore real-time listener for the user's library and
 * pushes every snapshot into the React Query cache slot that
 * `useLibrary()` reads from. Mount this once at the authenticated
 * shell (DashboardLayout) — every other consumer in the app just
 * reads from the cache and gets live updates for free.
 *
 * Why a sync hook instead of having every consumer subscribe on its
 * own:
 *
 * - The library is a relatively heavy fetch (N docs, one per resource)
 *   and gets requested by ~7 different surfaces (corpus modal,
 *   ExtractFromLibraryDialog, faculty source picker, dashboard,
 *   planner wizard, sermon series, sermon chat). Subscribing once
 *   means N=1 Firestore listener regardless of how many consumers
 *   are mounted.
 * - When a user uploads from the library page, the sync hook receives
 *   the new resource via the listener and pushes it to the cache —
 *   the corpus modal opened on a different tab sees the new resource
 *   instantly without its own refetch.
 * - First cold open of "Mi biblioteca" inside the corpus dialog used
 *   to wait several seconds for a fresh fetch; with this in place,
 *   the data is already cached by the time the user clicks the tab.
 *
 * Returns nothing — pure side effect.
 */
export function useLibrarySync(): void {
    const { user } = useFirebase();
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!user?.uid) return;
        const uid = user.uid;
        const unsubscribe = libraryService.subscribeToUserResources(
            uid,
            (resources: LibraryResourceEntity[]) => {
                queryClient.setQueryData(libraryQueryKey(uid), resources);
            },
            (error) => {
                console.error('[useLibrarySync] subscription error', error);
            },
        );
        return () => unsubscribe();
    }, [user?.uid, queryClient]);
}
