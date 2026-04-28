import { useCallback, useEffect, useState } from 'react';
import { libraryService, categoryService } from '@dosfilos/application';
import { LibraryCategory, LibraryResourceEntity } from '@dosfilos/domain';

/** Index check status for a resource — derived from the vector store, not the
 *  resource document itself (a resource may say `indexingStatus: 'ready'` but
 *  have no chunks if the indexer crashed mid-write).  */
export type IndexStatus = 'unknown' | 'indexed' | 'not-indexed' | 'checking';

interface UseLibraryResourcesResult {
    /** All resources owned by the user, sorted by Firestore listener order. */
    resources: LibraryResourceEntity[];
    /** Categories taxonomy for filtering / display. */
    categories: LibraryCategory[];
    /** Initial load (resources subscription not yet emitted). */
    loading: boolean;
    /** Per-resource index status, derived live from the vector store. */
    indexStatus: Record<string, IndexStatus>;
    /** Imperative setter — used by mutation hooks to flip status optimistically. */
    setIndexStatus: React.Dispatch<React.SetStateAction<Record<string, IndexStatus>>>;
    /** Resources whose index check returned `not-indexed`. */
    unindexedCount: number;
    /** Resources whose index check returned `indexed`. */
    indexedCount: number;
}

/**
 * Library data hook — subscribes to the user's library resources in real time
 * and tracks per-resource indexing status (queried separately because the
 * vector store is the source of truth for retrieval availability).
 *
 * Owns:
 * - Resources subscription (Firestore real-time listener)
 * - Categories taxonomy (one-shot fetch)
 * - Per-resource index check (one-shot per resource on subscription update)
 *
 * Does NOT own mutations — those live in dedicated hooks (useResourceProcessing,
 * useResourceUpload, useResourceMutations) which can imperatively update
 * `indexStatus` via the exposed setter when relevant.
 */
export function useLibraryResources(userId: string | null | undefined): UseLibraryResourcesResult {
    const [resources, setResources] = useState<LibraryResourceEntity[]>([]);
    const [categories, setCategories] = useState<LibraryCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [indexStatus, setIndexStatus] = useState<Record<string, IndexStatus>>({});

    // Categories — one-shot fetch keyed on userId
    useEffect(() => {
        if (!userId) return;
        categoryService.getCategories(userId).then(setCategories).catch(console.error);
    }, [userId]);

    // Index status check — runs after each resources update so newly added
    // resources get their status checked, and recently processed resources flip
    // from not-indexed → indexed.
    const checkAllIndexStatus = useCallback(async (list: LibraryResourceEntity[]) => {
        // Initialise to 'checking' for all resources synchronously so the UI
        // doesn't flicker between unknown → checking → final.
        const initial: Record<string, IndexStatus> = {};
        for (const r of list) initial[r.id] = 'checking';
        setIndexStatus(initial);

        // Then check each in parallel-ish (sequential to avoid Firestore quota
        // bursts on initial load with many resources).
        for (const r of list) {
            try {
                const isIndexed = await libraryService.isResourceIndexed(r.id);
                setIndexStatus(prev => ({ ...prev, [r.id]: isIndexed ? 'indexed' : 'not-indexed' }));
            } catch {
                setIndexStatus(prev => ({ ...prev, [r.id]: 'unknown' }));
            }
        }
    }, []);

    // Real-time subscription to user resources
    useEffect(() => {
        if (!userId) return;
        const unsubscribe = libraryService.subscribeToUserResources(userId, (updated) => {
            setResources(updated);
            setLoading(false);
            checkAllIndexStatus(updated);
        });
        return () => unsubscribe();
    }, [userId, checkAllIndexStatus]);

    const indexedCount = Object.values(indexStatus).filter(s => s === 'indexed').length;
    const unindexedCount = Object.values(indexStatus).filter(s => s === 'not-indexed').length;

    return {
        resources,
        categories,
        loading,
        indexStatus,
        setIndexStatus,
        indexedCount,
        unindexedCount,
    };
}
