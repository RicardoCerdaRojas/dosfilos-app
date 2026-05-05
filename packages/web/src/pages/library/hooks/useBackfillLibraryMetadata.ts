import { useCallback, useState } from 'react';
import { libraryService } from '@dosfilos/application';
import {
    inferBibleBooksFromTitle,
    type LibraryResourceEntity,
} from '@dosfilos/domain';
import { useFirebase } from '@/context/firebase-context';

/**
 * v1.7.1 — Bulk backfill of `coversBibleBooks` + `scope` for legacy
 * resources that were uploaded before the smart-match metadata fields
 * existed (or whose title-autofill returned `null` and the user never
 * filled them manually).
 *
 * Driven by the same `inferBibleBooksFromTitle` helper the upload
 * form uses, so the result is consistent with the autofill the user
 * sees on new uploads. Conservative by design: only writes when the
 * inferer returns a non-null `inferredScope`. Resources where the
 * title doesn't carry enough signal stay untouched and can be edited
 * manually from the resource card's edit modal.
 *
 * Sequential rather than parallel because the typical backfill set is
 * 5-30 resources — one Firestore write per match — and the simpler
 * loop avoids the rate-limit / partial-failure complexity. If future
 * libraries grow into the hundreds we can batch this server-side.
 */
export interface BackfillResult {
    /** How many resources were inspected (had `metadataIncomplete === true`). */
    inspected: number;
    /** How many got `coversBibleBooks` + `scope` written. */
    updated: number;
    /** How many had a title the inferer couldn't classify confidently. */
    skipped: number;
    /** How many writes failed (network / permission). Surfaced in toast. */
    failed: number;
}

export interface UseBackfillLibraryMetadataResult {
    /**
     * Resources eligible for backfill — the same predicate the
     * `ResourceCard` uses to render the "Faltan datos" pill, lifted to
     * library scope so the banner counts what the user actually sees.
     */
    incompleteResources: ReadonlyArray<LibraryResourceEntity>;
    /** True while the backfill is in flight. */
    isRunning: boolean;
    /** Last completed run's result, or null when never run this session. */
    lastResult: BackfillResult | null;
    /**
     * Kicks off the backfill. Returns the result on completion. Throws
     * only on the unrecoverable case (no user); per-resource failures
     * are counted in `result.failed` instead of propagating.
     */
    runBackfill: () => Promise<BackfillResult>;
}

/**
 * Predicate matching the same condition `ResourceCard` uses to show
 * the "Faltan datos" pill: the resource is ready, scope is at the
 * book/pericope granularity, AND the books array is empty. Whole-bible
 * / whole-testament scopes are treated as already-classified (their
 * empty `coversBibleBooks` is correct, not missing).
 */
export function isMetadataIncomplete(resource: LibraryResourceEntity): boolean {
    if (resource.textExtractionStatus !== 'ready') return false;
    const scope = (resource as { scope?: string }).scope ?? 'book';
    if (scope !== 'book' && scope !== 'pericope') return false;
    const covers = (resource as { coversBibleBooks?: ReadonlyArray<string> }).coversBibleBooks ?? [];
    return covers.length === 0;
}

export function useBackfillLibraryMetadata(
    resources: ReadonlyArray<LibraryResourceEntity>,
): UseBackfillLibraryMetadataResult {
    const { user } = useFirebase();
    const [isRunning, setIsRunning] = useState(false);
    const [lastResult, setLastResult] = useState<BackfillResult | null>(null);

    const incompleteResources = resources.filter(isMetadataIncomplete);

    const runBackfill = useCallback(async (): Promise<BackfillResult> => {
        if (!user?.uid) throw new Error('User not authenticated');
        setIsRunning(true);
        const result: BackfillResult = {
            inspected: incompleteResources.length,
            updated: 0,
            skipped: 0,
            failed: 0,
        };
        try {
            for (const resource of incompleteResources) {
                const inference = inferBibleBooksFromTitle(resource.title);
                if (inference.inferredScope === null) {
                    result.skipped += 1;
                    continue;
                }
                try {
                    await libraryService.updateResource(resource.id, {
                        coversBibleBooks: inference.books,
                        scope: inference.inferredScope,
                    });
                    result.updated += 1;
                } catch (err) {
                    console.warn('[BackfillLibraryMetadata] update failed for', resource.id, err);
                    result.failed += 1;
                }
            }
        } finally {
            setIsRunning(false);
            setLastResult(result);
        }
        return result;
    }, [user?.uid, incompleteResources]);

    return { incompleteResources, isRunning, lastResult, runBackfill };
}
