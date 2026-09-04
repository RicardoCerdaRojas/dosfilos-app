import { useTranslation } from '@/i18n';
import { type NavigateFunction } from 'react-router-dom';
import { toast } from 'sonner';
import { track } from '@/lib/analytics/track';
import { type Extraction } from '@dosfilos/domain';
import { useConfirm } from '@/hooks/useConfirm';

interface ExtractionMutation<TVars> {
    mutate: (vars: TVars) => void;
}

interface UseExtractionListHandlersParams {
    documentExtractionId: string | null;
    effectiveSessionId: string;
    navigate: NavigateFunction;
    setDocumentTitle: (title: string) => void;
    closeDocument: () => void;
    renameExtraction: ExtractionMutation<{ extractionId: string; title: string }>;
    addExtractionToProject: ExtractionMutation<{ extractionId: string; projectId: string }>;
    removeExtractionFromProject: ExtractionMutation<{ extractionId: string; projectId: string }>;
    deleteExtraction: ExtractionMutation<string>;
}

/**
 * Handlers for the "Generados" extraction-list panel: rename, pin to
 * project, unpin, delete, and jump-to-origin (the message that
 * spawned the artifact). Hoisted out of `chat.tsx` because the
 * page-level component was carrying this CRUD wiring without
 * touching any of its own state — the only chat state these need is
 * `documentExtractionId` (to mirror title edits + close the editor
 * on delete) and the navigate/sessionId for the jump-back.
 *
 * Hito 7 telemetry (`faculty_artifact_pinned_to_project`,
 * `faculty_artifact_deleted`) lives here so the events fire from a
 * single place regardless of which surface triggers the action.
 */
export function useExtractionListHandlers(params: UseExtractionListHandlersParams) {
    const {
        documentExtractionId,
        effectiveSessionId,
        navigate,
        setDocumentTitle,
        closeDocument,
        renameExtraction,
        addExtractionToProject,
        removeExtractionFromProject,
        deleteExtraction,
    } = params;
    const { t } = useTranslation('faculty');
    const { confirm, confirmDialog } = useConfirm();

    const handleRenameExtraction = (extraction: Extraction, newTitle: string) => {
        renameExtraction.mutate({ extractionId: extraction.id, title: newTitle });
        if (documentExtractionId === extraction.id) setDocumentTitle(newTitle);
    };

    const handleAddExtractionToProject = (extraction: Extraction, projectId: string) => {
        addExtractionToProject.mutate({ extractionId: extraction.id, projectId });
        track('faculty_artifact_pinned_to_project', {
            type: extraction.type,
            projectId,
            totalPinsAfter: extraction.projectIds.length + 1,
        });
        toast.success(t('extractionsList.toast.pinned'));
    };

    const handleRemoveExtractionFromProject = (extraction: Extraction, projectId: string) => {
        removeExtractionFromProject.mutate({ extractionId: extraction.id, projectId });
        toast.success(t('extractionsList.toast.unpinned'));
    };

    const handleDeleteExtraction = async (extraction: Extraction) => {
        if (!await confirm({ body: t('extractionsList.confirmDelete') })) return;
        deleteExtraction.mutate(extraction.id);
        track('faculty_artifact_deleted', {
            type: extraction.type,
            ageHours: Math.round((Date.now() - extraction.createdAt.getTime()) / 3_600_000),
        });
        if (documentExtractionId === extraction.id) closeDocument();
    };

    const handleJumpToOrigin = (extraction: Extraction) => {
        if (!extraction.sessionId) return;
        const messageHash = extraction.derivedFromMessageIds.length > 0
            ? `#origin=${extraction.derivedFromMessageIds.slice(-3).join(',')}`
            : '';
        if (extraction.sessionId === effectiveSessionId) {
            // Same session — scroll behavior is handled by a hash effect
            // in FacultyChatMessages that watches `#origin=...`.
            window.location.hash = messageHash.slice(1);
        } else {
            navigate(`/dashboard/faculty/${extraction.sessionId}${messageHash}`);
        }
    };

    return {
        handleRenameExtraction,
        handleAddExtractionToProject,
        handleRemoveExtractionFromProject,
        handleDeleteExtraction,
        handleJumpToOrigin,
        /**
         * El diálogo de confirmación del borrado. Quien monte este hook
         * tiene que renderizarlo: sin eso la pregunta no aparece y el
         * borrado nunca se confirma —a diferencia del `window.confirm`
         * de antes, que se dibujaba solo—.
         */
        confirmDialog,
    };
}
