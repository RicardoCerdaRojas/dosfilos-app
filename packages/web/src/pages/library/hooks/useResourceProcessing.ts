import { useCallback, useState } from 'react';
import { libraryService } from '@dosfilos/application';
import { LibraryResourceEntity } from '@dosfilos/domain';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n';
import { LibraryProgressState } from '../components/LibraryProgress';
import { IndexStatus } from './useLibraryResources';

interface UseResourceProcessingOptions {
    /**
     * Imperative setter for index status — typically the one returned by
     * `useLibraryResources`. We flip a resource's status optimistically after a
     * successful process/reprocess so the UI updates without waiting for the
     * Firestore subscription to roundtrip.
     */
    setIndexStatus: React.Dispatch<React.SetStateAction<Record<string, IndexStatus>>>;
}

interface UseResourceProcessingResult {
    /** ID of the resource currently being processed (or null). */
    processingResourceId: string | null;
    /** True while a bulk-process job is running. */
    bulkProcessing: boolean;
    /** Live progress for the bulk job (or null when not running). */
    bulkProgress: LibraryProgressState | null;
    /** Process a single resource for the first time. */
    processResource: (resource: LibraryResourceEntity) => Promise<void>;
    /** Force-reprocess a resource (deletes existing chunks and rebuilds). */
    reprocessResource: (resource: LibraryResourceEntity) => Promise<void>;
    /** Bulk-process every resource in `resources` whose status is `not-indexed`. */
    processAll: (resources: LibraryResourceEntity[], indexStatus: Record<string, IndexStatus>) => Promise<void>;
}

/**
 * Encapsulates all resource processing actions: single, reprocess (with
 * confirmation), and bulk. Handles toasts, status flips, and progress tracking.
 *
 * Side effects beyond the hook:
 * - Toast notifications via sonner
 * - Browser `confirm()` dialog for reprocess (acceptable: it's a destructive
 *   admin-style action; a custom modal would be UX overkill)
 * - Mutates `indexStatus` via the injected setter
 */
export function useResourceProcessing({ setIndexStatus }: UseResourceProcessingOptions): UseResourceProcessingResult {
    const { t } = useTranslation('library');
    const [processingResourceId, setProcessingResourceId] = useState<string | null>(null);
    const [bulkProcessing, setBulkProcessing] = useState(false);
    const [bulkProgress, setBulkProgress] = useState<LibraryProgressState | null>(null);

    const processResource = useCallback(async (resource: LibraryResourceEntity) => {
        setProcessingResourceId(resource.id);
        try {
            const chunks = await libraryService.indexResource(resource);
            if (chunks > 0) {
                toast.success(t('toast.processSuccess', { title: resource.title, chunks }));
                setIndexStatus(prev => ({ ...prev, [resource.id]: 'indexed' }));
            } else {
                toast.warning(t('toast.processWarning', { title: resource.title }));
            }
        } catch (error) {
            console.error('Process error:', error);
            if (error instanceof Error && error.message === 'TEXT_NOT_READY') {
                toast.warning(t('toast.textNotReady'), { duration: 5000 });
            } else {
                toast.error(t('toast.processError'));
            }
        } finally {
            setProcessingResourceId(null);
        }
    }, [t, setIndexStatus]);

    const reprocessResource = useCallback(async (resource: LibraryResourceEntity) => {
        // Reprocess is destructive (deletes existing chunks). Confirm before run.
        if (!confirm(t('toast.reprocessConfirm', { title: resource.title }))) {
            return;
        }
        setProcessingResourceId(resource.id);
        try {
            const chunks = await libraryService.indexResource(resource, { force: true });
            if (chunks > 0) {
                toast.success(t('toast.reprocessSuccess', { title: resource.title, chunks }));
                setIndexStatus(prev => ({ ...prev, [resource.id]: 'indexed' }));
            } else {
                toast.warning(t('toast.reprocessWarning'));
            }
        } catch (error) {
            console.error('Reprocess error:', error);
            toast.error(t('toast.reprocessError'));
        } finally {
            setProcessingResourceId(null);
        }
    }, [t, setIndexStatus]);

    const processAll = useCallback(async (
        resources: LibraryResourceEntity[],
        indexStatus: Record<string, IndexStatus>,
    ) => {
        setBulkProcessing(true);
        try {
            const pending = resources.filter(r => indexStatus[r.id] === 'not-indexed');
            if (pending.length === 0) {
                toast.info(t('toast.noUnindexed'));
                return;
            }

            let totalChunks = 0;
            let processedCount = 0;
            let errorCount = 0;
            let notReadyCount = 0;

            for (const resource of pending) {
                processedCount++;
                setBulkProgress({
                    current: processedCount,
                    total: pending.length,
                    currentTitle: resource.title,
                });
                setProcessingResourceId(resource.id);
                try {
                    const chunks = await libraryService.indexResource(resource);
                    totalChunks += chunks;
                    setIndexStatus(prev => ({ ...prev, [resource.id]: 'indexed' }));
                } catch (error) {
                    if (error instanceof Error && error.message === 'TEXT_NOT_READY') {
                        // Not really an error — extraction is still running in
                        // the background. Count separately so the summary toast
                        // can tell the user "still processing, retry in a bit"
                        // instead of a scary failure count.
                        notReadyCount++;
                    } else {
                        console.error(`Error processing ${resource.title}:`, error);
                        errorCount++;
                    }
                }
            }

            if (errorCount > 0) {
                toast.warning(t('toast.processingComplete', { count: errorCount, chunks: totalChunks }));
            } else if (notReadyCount > 0 && totalChunks === 0) {
                // Everything that was attempted is still extracting. Surface
                // the friendly "wait a bit" message instead of a generic
                // success toast for zero work done.
                toast.warning(t('toast.textNotReady'), { duration: 5000 });
            } else {
                toast.success(t('toast.processingSuccess', { chunks: totalChunks }));
            }
        } catch (error) {
            console.error('Bulk process error:', error);
            toast.error(t('toast.processingError'));
        } finally {
            setBulkProcessing(false);
            setProcessingResourceId(null);
            setBulkProgress(null);
        }
    }, [t, setIndexStatus]);

    return {
        processingResourceId,
        bulkProcessing,
        bulkProgress,
        processResource,
        reprocessResource,
        processAll,
    };
}
