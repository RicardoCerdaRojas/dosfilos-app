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

interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    body: string;
    confirmLabel: string;
    cancelLabel: string;
    onConfirm: () => void;
    /** When true (default), the action button uses destructive styling. */
    destructive?: boolean;
}

/**
 * Replaces `window.confirm` for destructive or impactful actions.
 * Uses the AlertDialog primitive so the dialog blocks interaction
 * and respects keyboard shortcuts (Esc cancels, Enter confirms).
 *
 * Two-button layout: cancel (left, ghost) + confirm (right, primary
 * or destructive depending on `destructive` flag).
 */
export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    body,
    confirmLabel,
    cancelLabel,
    onConfirm,
    destructive = true,
}: ConfirmDialogProps) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>{body}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        className={destructive
                            ? 'bg-destructive text-white hover:bg-destructive/90'
                            : undefined
                        }
                    >
                        {confirmLabel}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
