import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useTranslation } from '@/i18n';

interface FacultyConfirmDialogsProps {
    deleteSessionId: string | null;
    onCloseDeleteSession: () => void;
    onConfirmDeleteSession: () => void;

    deleteMessageId: string | null;
    onCloseDeleteMessage: () => void;
    onConfirmDeleteMessage: () => void;
}

/**
 * Two destructive-action confirmations for the Faculty chat:
 * delete session + delete message. Hoisted out of `chat.tsx` for
 * the same reason all dialogs live in their own files — keeps the
 * page-level component focused on layout + state, not modal markup.
 */
export function FacultyConfirmDialogs({
    deleteSessionId,
    onCloseDeleteSession,
    onConfirmDeleteSession,
    deleteMessageId,
    onCloseDeleteMessage,
    onConfirmDeleteMessage,
}: FacultyConfirmDialogsProps) {
    const { t } = useTranslation('faculty');
    return (
        <>
            <AlertDialog open={!!deleteSessionId} onOpenChange={(open) => !open && onCloseDeleteSession()}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('dialogs.deleteSessionTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('dialogs.deleteSessionDescription')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('dialogs.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={onConfirmDeleteSession}
                            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                        >
                            {t('dialogs.delete')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog
                open={!!deleteMessageId}
                onOpenChange={(open) => !open && onCloseDeleteMessage()}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('dialogs.deleteMessageTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('dialogs.deleteMessageDescription')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('dialogs.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={onConfirmDeleteMessage}
                            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                        >
                            {t('dialogs.delete')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
