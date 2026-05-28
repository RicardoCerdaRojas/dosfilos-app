import type { AIChatSession, AIProject, Extraction } from '@dosfilos/domain';
import { facultyService } from '@dosfilos/application';
import { SermonOutlinePreviewModal, type SermonOutline } from '@/components/faculty/SermonOutlinePreviewModal';
import { EmailExtractionDialog } from '@/components/faculty/EmailExtractionDialog';
import { PublishToWordpressDialog } from '@/components/faculty/PublishToWordpressDialog';
import { ProjectEditDialog } from '../ProjectEditDialog';
import { FacultyConfirmDialogs } from './FacultyConfirmDialogs';

type ProjectDialogState =
    | { mode: 'create' }
    | { mode: 'edit'; project: AIProject };

interface Props {
    sermonOutline: SermonOutline | null;
    onSetSermonOutline: (outline: SermonOutline | null) => void;
    session: AIChatSession | null | undefined;
    effectiveSessionId: string;
    userId: string | undefined;
    onSermonGenerated: (sermonId: string) => void;

    projectDialog: ProjectDialogState | null;
    onCloseProjectDialog: () => void;

    emailDialogExtraction: Extraction | null;
    onCloseEmailDialog: () => void;

    wpDialogExtraction: Extraction | null;
    onCloseWpDialog: () => void;

    deleteConfirmId: string | null;
    onCloseDeleteSession: () => void;
    onConfirmDeleteSession: () => void;

    deleteMessageConfirmId: string | null;
    onCloseDeleteMessage: () => void;
    onConfirmDeleteMessage: () => void;
}

/**
 * Phase 2.5 Boy-Scout (chat.tsx decomposition) — collected modal/dialog
 * cluster previously inlined at the end of `FacultyChatPage`. Moves ~65
 * lines of JSX into a focused, single-purpose component without changing
 * any behavior.
 */
export function FacultyChatModals({
    sermonOutline,
    onSetSermonOutline,
    session,
    effectiveSessionId,
    userId,
    onSermonGenerated,
    projectDialog,
    onCloseProjectDialog,
    emailDialogExtraction,
    onCloseEmailDialog,
    wpDialogExtraction,
    onCloseWpDialog,
    deleteConfirmId,
    onCloseDeleteSession,
    onConfirmDeleteSession,
    deleteMessageConfirmId,
    onCloseDeleteMessage,
    onConfirmDeleteMessage,
}: Props) {
    return (
        <>
            <SermonOutlinePreviewModal
                outline={sermonOutline}
                sessionId={effectiveSessionId || undefined}
                onClose={() => onSetSermonOutline(null)}
                onGenerateFullSermon={async (outline, personalization) => {
                    if (!userId || !effectiveSessionId) {
                        throw new Error('Faculty session missing for sermon generation');
                    }
                    const messageIds = session?.messages?.map((m) => m.id) ?? [];
                    const result = await facultyService.buildSermonFromFacultyOutline.execute({
                        ownerId: userId,
                        sessionId: effectiveSessionId,
                        sessionTitle: session?.title || outline.title,
                        approvedOutline: outline,
                        personalization,
                        derivedFromMessageIds: messageIds,
                    });
                    return { sermonId: result.sermonId };
                }}
                onSuccess={onSermonGenerated}
            />

            {projectDialog && (
                <ProjectEditDialog
                    project={projectDialog.mode === 'edit' ? projectDialog.project : undefined}
                    onClose={onCloseProjectDialog}
                />
            )}

            <EmailExtractionDialog
                extraction={emailDialogExtraction}
                onClose={onCloseEmailDialog}
            />

            <PublishToWordpressDialog
                extraction={wpDialogExtraction}
                onClose={onCloseWpDialog}
            />

            <FacultyConfirmDialogs
                deleteSessionId={deleteConfirmId}
                onCloseDeleteSession={onCloseDeleteSession}
                onConfirmDeleteSession={onConfirmDeleteSession}
                deleteMessageId={deleteMessageConfirmId}
                onCloseDeleteMessage={onCloseDeleteMessage}
                onConfirmDeleteMessage={onConfirmDeleteMessage}
            />
        </>
    );
}
