import { useCallback, useEffect, useMemo, useState } from 'react';
import { libraryService, categoryService } from '@dosfilos/application';
import { LibraryCategory, LibraryResourceEntity } from '@dosfilos/domain';
import { useLibrary } from '@/hooks/library';

/** Index check status for a resource — derived from the vector store, not the
 *  resource document itself (a resource may say `indexingStatus: 'ready'` but
 *  have no chunks if the indexer crashed mid-write).
 *
 *  - `unknown`     — initial state before any check
 *  - `checking`    — querying the chunks collection (legacy resources only)
 *  - `indexed`     — chunks present, ready to query
 *  - `indexing`    — auto-indexer is actively running (Firestore field
 *                    `indexingStatus: 'processing'` OR auto-indexable
 *                    extractor finished but trigger hasn't recorded a state
 *                    yet — optimistic, since the trigger fires in <1s)
 *  - `not-indexed` — extraction is done but indexer didn't / can't run
 *                    (failed, or legacy extractor not in AUTO_INDEXED_VERSIONS)
 *                    — needs manual "Procesar" action.
 */
export type IndexStatus = 'unknown' | 'indexed' | 'not-indexed' | 'checking' | 'indexing';

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
    '5.0-pdfparse-structured',
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
    /**
     * Resources whose text extracted fine but whose INDEXING failed
     * (`indexingStatus === 'failed'`). Distinct from `failedCount`,
     * which covers extraction failures and usually means "re-upload".
     *
     * These are recoverable without spending a single page of the
     * user's balance: the extractor's `structured.md` is already in
     * Cloud Storage, so a retry re-chunks and re-embeds from it. Until
     * this list existed the state was effectively invisible — the amber
     * "por procesar" callout deliberately skips auto-indexable
     * resources, so an indexing failure surfaced nowhere but a tooltip
     * on one card.
     */
    indexFailedResources: LibraryResourceEntity[];
}

/**
 * Library data hook — reads from the shared cache populated by
 * `useLibrarySync` (mounted once at the dashboard shell) and layers
 * per-resource indexing-status decoration on top. Subscriptions and
 * indexing-transition toasts live in the sync hook so this one stays
 * focused on the page-specific decoration the LibraryManager needs.
 *
 * Owns:
 * - Categories taxonomy (one-shot fetch)
 * - Per-resource index check (one-shot per resource on cache update)
 * - Counts derived from extraction + index state (drives the page's
 *   attention callouts).
 *
 * Does NOT own mutations — those live in dedicated hooks (useResourceProcessing,
 * useResourceUpload, useResourceMutations) which can imperatively update
 * `indexStatus` via the exposed setter when relevant.
 */
export function useLibraryResources(userId: string | null | undefined): UseLibraryResourcesResult {
    const { resources, isLoading: loading } = useLibrary();
    const [categories, setCategories] = useState<LibraryCategory[]>([]);
    const [indexStatus, setIndexStatus] = useState<Record<string, IndexStatus>>({});

    // Categories — one-shot fetch keyed on userId
    useEffect(() => {
        if (!userId) return;
        categoryService.getCategories(userId).then(setCategories).catch(console.error);
    }, [userId]);

    // Index status check — runs after each resources update so newly added
    // resources get their status checked, and recently processed resources flip
    // from not-indexed → indexed.
    //
    // Strategy: prefer the resource doc's `indexingStatus` field (set by the
    // `indexStructuredDocument` cloud function explicitly to `'ready'` AFTER
    // committing all chunks — guaranteed to be consistent with the chunks
    // collection by the time we see it via the real-time listener). Fall
    // back to a chunks-collection probe ONLY when the field is absent,
    // which only happens for legacy resources indexed before the cloud
    // function started writing this field.
    //
    // This eliminates a race condition where the listener fired with the
    // updated doc but the chunks collection query hadn't yet propagated
    // the new writes (Firestore is eventually consistent for queries) —
    // surfaced as a card stuck in "Por procesar" until the user refreshed.
    const checkAllIndexStatus = useCallback(async (list: LibraryResourceEntity[]) => {
        // Initialise to 'checking' for all resources synchronously so the UI
        // doesn't flicker between unknown → checking → final.
        const initial: Record<string, IndexStatus> = {};
        // System sources hold no chunks by design, so they start (and stay)
        // at 'unknown' — that's the one value the card reads as "render no
        // status pill at all", which is what a metadata-only catalog entry
        // deserves. Marking them 'checking' spun a verifying spinner, and
        // letting them fall through to the probe below fired one pointless
        // Firestore query per seed doc on every snapshot.
        for (const r of list) initial[r.id] = r.isSystemSource ? 'unknown' : 'checking';
        setIndexStatus(initial);

        for (const r of list) {
            if (r.isSystemSource) continue;
            // Fast path: use the doc field (no I/O, no race).
            if (r.indexingStatus === 'ready') {
                setIndexStatus(prev => ({ ...prev, [r.id]: 'indexed' }));
                continue;
            }
            // Indexer actively running — distinct from "needs action".
            // The card shows a spinner + "Indexando…" so the user sees
            // the work in flight instead of a static "Por procesar".
            if (r.indexingStatus === 'processing') {
                setIndexStatus(prev => ({ ...prev, [r.id]: 'indexing' }));
                continue;
            }
            if (r.indexingStatus === 'failed') {
                setIndexStatus(prev => ({ ...prev, [r.id]: 'not-indexed' }));
                continue;
            }
            // No `indexingStatus` set yet. If the extractor's output IS
            // auto-indexable AND extraction just finished, optimistically
            // call it "indexing" — the auto-indexer trigger fires in <1s
            // after the extraction write, so the brief gap shouldn't
            // surface as "needs manual action".
            if (
                !r.indexingStatus
                && r.textExtractionStatus === 'ready'
                && r.extractionVersion
                && AUTO_INDEXED_VERSIONS.has(r.extractionVersion)
            ) {
                setIndexStatus(prev => ({ ...prev, [r.id]: 'indexing' }));
                continue;
            }
            // Legacy / pre-cloud-function resources: fall back to the
            // chunks query.
            try {
                const isIndexed = await libraryService.isResourceIndexed(r.id);
                setIndexStatus(prev => ({ ...prev, [r.id]: isIndexed ? 'indexed' : 'not-indexed' }));
            } catch {
                setIndexStatus(prev => ({ ...prev, [r.id]: 'unknown' }));
            }
        }
    }, []);

    // Re-run the index check whenever the cache emits a new resources
    // snapshot. The sync hook is the source of truth for the array;
    // this hook reacts to it.
    useEffect(() => {
        if (loading) return;
        checkAllIndexStatus(resources);
    }, [resources, loading, checkAllIndexStatus]);

    const indexedCount = Object.values(indexStatus).filter(s => s === 'indexed').length;

    // Derived counts split by what the user actually needs to do (or
    // not do). Re-computed on every render but cheap — small N.
    const { actionablePendingCount, extractingCount, failedCount, indexFailedResources } = useMemo(() => {
        let actionable = 0;
        let extracting = 0;
        let failed = 0;
        const indexFailed: LibraryResourceEntity[] = [];
        for (const r of resources) {
            // System sources (the `core-library-seed.json` catalog entries:
            // SBLGNT, the Chicago Statements, the confessional witnesses)
            // are metadata-only — no file, no extraction, no chunks. They
            // must never land in any of these counters: they'd report work
            // that is not queued and cannot be acted on. Legacy seed docs
            // written before the ingest stamped `textExtractionStatus` read
            // back as `'pending'` via the repository default, which is what
            // produced the permanent "8 recursos extrayendo texto" banner.
            if (r.isSystemSource) continue;
            const status = indexStatus[r.id] ?? 'unknown';
            if (r.textExtractionStatus === 'pending' || r.textExtractionStatus === 'processing') {
                extracting++;
                continue;
            }
            if (r.textExtractionStatus === 'failed') {
                failed++;
                continue;
            }
            // Extraction succeeded but the indexer blew up. Collected
            // separately from `actionable` because the recovery is a
            // free retry (the extractor's output is already in Storage),
            // and because the skip below would otherwise swallow it —
            // every resource that reaches the indexer at all carries an
            // auto-indexable `extractionVersion`.
            if (r.indexingStatus === 'failed') {
                indexFailed.push(r);
                continue;
            }
            if (r.textExtractionStatus === 'ready' && status === 'not-indexed') {
                // Skip if extraction version triggers auto-indexing —
                // the cloud function will (re)build chunks shortly.
                if (r.extractionVersion && AUTO_INDEXED_VERSIONS.has(r.extractionVersion)) continue;
                actionable++;
            }
        }
        return {
            actionablePendingCount: actionable,
            extractingCount: extracting,
            failedCount: failed,
            indexFailedResources: indexFailed,
        };
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
        indexFailedResources,
    };
}
