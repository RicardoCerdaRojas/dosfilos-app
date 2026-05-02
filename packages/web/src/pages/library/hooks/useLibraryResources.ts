import { useCallback, useEffect, useMemo, useState } from 'react';
import { libraryService, categoryService } from '@dosfilos/application';
import { LibraryCategory, LibraryResourceEntity } from '@dosfilos/domain';

/** Index check status for a resource — derived from the vector store, not the
 *  resource document itself (a resource may say `indexingStatus: 'ready'` but
 *  have no chunks if the indexer crashed mid-write).  */
export type IndexStatus = 'unknown' | 'indexed' | 'not-indexed' | 'checking';

/**
 * Extraction versions whose successful completion fires the
 * `autoIndexOnExtractionReady` cloud function. A resource extracted
 * with one of these doesn't need the user to click "Procesar
 * pendientes" — the indexer runs by itself.
 *
 * Keep in sync with `SUPPORTED_VERSIONS` in
 * `packages/functions/src/library/autoIndexOnExtractionReady.ts`.
 */
const AUTO_INDEXED_VERSIONS = new Set<string>([
    '3.0-llamaparse',
    '4.0-gemini-standard',
]);

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
    /**
     * Resources that need a manual "Procesar" click to be indexed:
     *   - textExtractionStatus === 'ready' (text exists)
     *   - indexStatus === 'not-indexed' (no chunks yet)
     *   - extractionVersion is NOT one of `AUTO_INDEXED_VERSIONS` —
     *     i.e. the auto-index trigger did NOT (and won't) fire.
     *
     * Drives the amber "X recursos por procesar" callout. Excludes
     * resources still extracting (covered by `extractingCount`),
     * resources with extraction errors (`failedCount`), and
     * auto-indexable resources whose chunks haven't materialized yet
     * (transitory; the trigger will run shortly).
     */
    actionablePendingCount: number;
    /** Resources whose index check returned `indexed`. */
    indexedCount: number;
    /**
     * Resources whose cloud function is still running text extraction
     * (`textExtractionStatus` ∈ {'pending', 'processing'}). User
     * doesn't need to act — they just wait.
     */
    extractingCount: number;
    /**
     * Resources whose extraction failed entirely
     * (`textExtractionStatus === 'failed'`). User probably needs to
     * re-upload or contact support.
     */
    failedCount: number;
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

    // Derived counts split by what the user actually needs to do (or
    // not do). Re-computed on every render but cheap — small N.
    const { actionablePendingCount, extractingCount, failedCount } = useMemo(() => {
        let actionable = 0;
        let extracting = 0;
        let failed = 0;
        for (const r of resources) {
            const status = indexStatus[r.id] ?? 'unknown';
            if (r.textExtractionStatus === 'pending' || r.textExtractionStatus === 'processing') {
                extracting++;
                continue;
            }
            if (r.textExtractionStatus === 'failed') {
                failed++;
                continue;
            }
            if (r.textExtractionStatus === 'ready' && status === 'not-indexed') {
                // Skip if extraction version triggers auto-indexing —
                // the cloud function will (re)build chunks shortly.
                if (r.extractionVersion && AUTO_INDEXED_VERSIONS.has(r.extractionVersion)) continue;
                actionable++;
            }
        }
        return { actionablePendingCount: actionable, extractingCount: extracting, failedCount: failed };
    }, [resources, indexStatus]);

    return {
        resources,
        categories,
        loading,
        indexStatus,
        setIndexStatus,
        indexedCount,
        actionablePendingCount,
        extractingCount,
        failedCount,
    };
}
