import React from 'react';
import { Loader2, LogIn, UserCog } from 'lucide-react';
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

interface ImpersonateUserDialogProps {
    user: { displayName?: string; email: string } | null;
    isLoading: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}

export const ImpersonateUserDialog: React.FC<ImpersonateUserDialogProps> = ({
    user,
    isLoading,
    onCancel,
    onConfirm,
}) => {
    const { t } = useTranslation('admin');
    const name = user?.displayName || user?.email || '';

    return (
        <AlertDialog open={!!user} onOpenChange={(open) => !open && onCancel()}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        <UserCog className="h-5 w-5 text-warning" />
                        {t('users.impersonateDialog.title')}
                    </AlertDialogTitle>
                    <AlertDialogDescription asChild>
                        <div className="space-y-3">
                            <p>{t('users.impersonateDialog.intro', { name })}</p>
                            <div className="rounded-md border bg-muted/50 p-3 text-sm">
                                <div className="font-medium text-foreground">{name}</div>
                                {user?.email && user.email !== name && (
                                    <div className="text-muted-foreground">{user.email}</div>
                                )}
                            </div>
                            <ul className="list-disc space-y-1 pl-5 text-sm">
                                <li>{t('users.impersonateDialog.point1')}</li>
                                <li>{t('users.impersonateDialog.point2')}</li>
                                <li>{t('users.impersonateDialog.point3')}</li>
                            </ul>
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isLoading}>{t('users.impersonateDialog.cancel')}</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => { e.preventDefault(); onConfirm(); }}
                        className="bg-warning text-warning-foreground hover:bg-warning/90 focus:ring-warning"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('users.impersonateDialog.loading')}</>
                        ) : (
                            <><LogIn className="mr-2 h-4 w-4" />{t('users.impersonateDialog.confirm')}</>
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};
