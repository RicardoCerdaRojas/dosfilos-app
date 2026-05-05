import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { libraryService } from '@dosfilos/application';
import type { LibraryResourceEntity } from '@dosfilos/domain';
import { useFirebase } from '@/context/firebase-context';
import { useTranslation } from '@/i18n';
import { libraryQueryKey } from './useLibrary';

/**
 * Mounts ONE Firestore real-time listener for the user's library and
 * pushes every snapshot into the React Query cache slot that
 * `useLibrary()` reads from. Mount this once at the authenticated
 * shell (DashboardLayout) — every other consumer in the app just
 * reads from the cache and gets live updates for free.
 *
 * Also owns the indexing-transition toasts ("X listo" / "X falló").
 * Lives here rather than in `useLibraryResources` (the LibraryManager
 * page hook) so notifications fire wherever the user is in the app —
 * if a 200-page upload finishes indexing while you're writing in the
 * exegesis module, you still want to know.
 *
 * Returns nothing — pure side effect.
 */
export function useLibrarySync(): void {
    const { user } = useFirebase();
    const queryClient = useQueryClient();
    const { t } = useTranslation('library');

    // Last seen `indexingStatus` per resource. Used to detect
    // transitions across listener emissions and fire EXACTLY one toast
    // per resource entering a terminal state.
    const lastIndexingState = useRef<Map<string, string>>(new Map());
    // Skip toasts on the very first emission so existing-on-load
    // resources don't toast all at once when the listener hydrates.
    const initialEmissionDone = useRef(false);

    useEffect(() => {
        if (!user?.uid) return;
        const uid = user.uid;
        // Reset transition tracking when the user changes (e.g.
        // re-login). Stale state from a previous session would
        // otherwise mis-detect transitions.
        lastIndexingState.current = new Map();
        initialEmissionDone.current = false;

        const unsubscribe = libraryService.subscribeToUserResources(
            uid,
            (resources: LibraryResourceEntity[]) => {
                queryClient.setQueryData(libraryQueryKey(uid), resources);

                if (initialEmissionDone.current) {
                    for (const r of resources) {
                        const prev = lastIndexingState.current.get(r.id);
                        const curr = r.indexingStatus ?? 'unknown';
                        if (prev && prev !== curr) {
                            if (curr === 'ready') {
                                const chunks = (r as { indexedChunkCount?: number }).indexedChunkCount;
                                toast.success(
                                    t('toast.processSuccess', {
                                        title: r.title,
                                        chunks: chunks ?? '?',
                                    }),
                                );
                            } else if (curr === 'failed') {
                                toast.error(
                                    t('toast.processError') + (r.title ? ` — ${r.title}` : ''),
                                );
                            }
                        }
                        lastIndexingState.current.set(r.id, curr);
                    }
                } else {
                    for (const r of resources) {
                        lastIndexingState.current.set(r.id, r.indexingStatus ?? 'unknown');
                    }
                    initialEmissionDone.current = true;
                }
            },
            (error) => {
                console.error('[useLibrarySync] subscription error', error);
            },
        );
        return () => unsubscribe();
    }, [user?.uid, queryClient, t]);
}
