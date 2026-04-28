import React from 'react';
import { Loader2 } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/i18n';
import { Trans } from 'react-i18next';

interface DeleteUserDialogProps {
    user: { email: string } | null;
    confirmEmail: string;
    isDeleting: boolean;
    onConfirmEmailChange: (value: string) => void;
    onCancel: () => void;
    onConfirm: () => void;
}

export const DeleteUserDialog: React.FC<DeleteUserDialogProps> = ({
    user,
    confirmEmail,
    isDeleting,
    onConfirmEmailChange,
    onCancel,
    onConfirm,
}) => {
    const { t } = useTranslation('admin');

    return (
        <AlertDialog open={!!user} onOpenChange={(open) => { if (!open) onCancel(); }}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-destructive">{t('users.deleteDialog.title')}</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                        <div className="space-y-3">
                            <p>
                                <Trans
                                    ns="admin"
                                    i18nKey="users.deleteDialog.warning"
                                    components={{ strong: <strong /> }}
                                />
                            </p>
                            <ul className="list-disc pl-5 text-sm space-y-1 text-foreground">
                                <li>{t('users.deleteDialog.items.auth')}</li>
                                <li>{t('users.deleteDialog.items.content')}</li>
                                <li>{t('users.deleteDialog.items.history')}</li>
                                <li>{t('users.deleteDialog.items.subscription')}</li>
                            </ul>
                            <p className="text-sm">
                                {t('users.deleteDialog.confirmPrompt')}{' '}
                                <span className="font-mono font-semibold text-foreground">{user?.email}</span>
                            </p>
                            <Input
                                id="delete-confirm-email"
                                placeholder={t('users.deleteDialog.placeholder')}
                                value={confirmEmail}
                                onChange={(e) => onConfirmEmailChange(e.target.value)}
                                className="border-destructive/40 focus:ring-destructive"
                            />
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>{t('users.deleteDialog.cancel')}</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => { e.preventDefault(); onConfirm(); }}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90 focus:ring-destructive"
                        disabled={isDeleting || confirmEmail !== user?.email}
                    >
                        {isDeleting ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('users.deleteDialog.loading')}</>
                        ) : (
                            t('users.deleteDialog.confirm')
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};
