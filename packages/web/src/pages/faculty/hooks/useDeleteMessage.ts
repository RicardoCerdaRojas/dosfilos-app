import { useState } from 'react';

interface UseDeleteMessageParams {
    /**
     * Mutation function from `useFacultyChat`. Awaited inside the
     * confirmation handler so we can clear the per-message spinner
     * after Firestore + server-side cleanup completes (the actual
     * cache invalidation rides the mutation's own onSuccess).
     */
    deleteMessage: (messageId: string) => Promise<unknown>;
}

/**
 * Owns the delete-message confirmation flow:
 *
 *   - `requestDeleteMessage(id)` opens the confirm dialog by setting
 *     `confirmId`. The render layer reads this to render the dialog.
 *   - `cancelDelete()` closes the dialog (used by the dialog's
 *     `onOpenChange` when the user dismisses).
 *   - `handleConfirmDeleteMessage()` clears the dialog, sets the
 *     per-row deleting spinner, awaits the mutation, and clears the
 *     spinner whether it succeeds or throws.
 *
 * The dialog itself lives in `FacultyConfirmDialogs`; this hook owns
 * only the state + the async handler.
 */
export function useDeleteMessage(params: UseDeleteMessageParams) {
    const { deleteMessage } = params;
    const [confirmId, setConfirmId] = useState<string | null>(null);
    const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);

    const requestDeleteMessage = (messageId: string) => setConfirmId(messageId);
    const cancelDelete = () => setConfirmId(null);

    const handleConfirmDeleteMessage = async () => {
        if (!confirmId) return;
        const id = confirmId;
        setConfirmId(null);
        setDeletingMessageId(id);
        try {
            await deleteMessage(id);
        } finally {
            setDeletingMessageId(null);
        }
    };

    return {
        deleteMessageConfirmId: confirmId,
        deletingMessageId,
        requestDeleteMessage,
        cancelDelete,
        handleConfirmDeleteMessage,
    };
}
