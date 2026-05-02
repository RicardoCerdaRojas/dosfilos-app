import { useCallback, useState } from 'react';
import { libraryService } from '@dosfilos/application';
import { ResourceType } from '@dosfilos/domain';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n';

export interface ResourceUpdates {
    title: string;
    author: string;
    type: ResourceType;
    isCore?: boolean;
    coreContext?: 'exegesis' | 'homiletics' | 'generic';
}

interface UseResourceMutationsResult {
    /** Delete a resource by id. Toasts success/error. Caller handles UI close. */
    deleteResource: (id: string) => Promise<void>;
    /**
     * Id of the resource currently being deleted (for spinner / disabled
     * states in the confirm dialog and the per-card visual). Null when
     * no delete is in flight.
     */
    deletingResourceId: string | null;
    /** Save resource metadata updates. Throws on error so caller can keep modal open. */
    saveResource: (id: string, updates: ResourceUpdates) => Promise<void>;
}

/**
 * Encapsulates resource CRUD operations (delete + metadata update).
 *
 * Each method:
 * - Calls the service
 * - Shows a toast on success or error
 * - For `saveResource`: re-throws the error so the caller (e.g. EditResourceModal)
 *   can keep itself open if the save failed
 *
 * Real-time Firestore subscription in `useLibraryResources` will pick up the
 * changes — no explicit refetch is needed here.
 *
 * Exposes `deletingResourceId` so the calling page can dim/spinner the
 * specific row being deleted and disable the confirm button while the
 * delete request is in flight (Storage object delete + chunk
 * cleanup + Firestore doc delete can take 1-3s for big resources, and
 * the user shouldn't be able to mash the button or move on without
 * feedback).
 */
export function useResourceMutations(): UseResourceMutationsResult {
    const { t } = useTranslation('library');
    const [deletingResourceId, setDeletingResourceId] = useState<string | null>(null);

    const deleteResource = useCallback(async (id: string) => {
        setDeletingResourceId(id);
        try {
            await libraryService.deleteResource(id);
            toast.success(t('toast.deleteSuccess'));
        } catch (error) {
            console.error('Delete error:', error);
            toast.error(t('toast.deleteError'));
        } finally {
            setDeletingResourceId(null);
        }
    }, [t]);

    const saveResource = useCallback(async (id: string, updates: ResourceUpdates) => {
        try {
            await libraryService.updateResource(id, updates);
            toast.success(t('toast.updateSuccess'));
        } catch (error) {
            console.error('Update error:', error);
            toast.error(t('toast.updateError'));
            throw error;
        }
    }, [t]);

    return { deleteResource, deletingResourceId, saveResource };
}
