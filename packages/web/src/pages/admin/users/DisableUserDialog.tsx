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
import { useTranslation } from '@/i18n';
import { Trans } from 'react-i18next';

interface DisableUserDialogProps {
    user: { email: string } | null;
    isDisabling: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}

export const DisableUserDialog: React.FC<DisableUserDialogProps> = ({
    user,
    isDisabling,
    onCancel,
    onConfirm,
}) => {
    const { t } = useTranslation('admin');

    return (
        <AlertDialog open={!!user} onOpenChange={(open) => !open && onCancel()}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t('users.disableDialog.title')}</AlertDialogTitle>
                    <AlertDialogDescription>
                        <Trans
                            ns="admin"
                            i18nKey="users.disableDialog.description"
                            values={{ email: user?.email ?? '' }}
                            components={{ strong: <strong className="text-foreground" /> }}
                        />
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDisabling}>{t('users.disableDialog.cancel')}</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => { e.preventDefault(); onConfirm(); }}
                        className="bg-warning text-warning-foreground hover:bg-warning/90 focus:ring-warning"
                        disabled={isDisabling}
                    >
                        {isDisabling ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('users.disableDialog.loading')}</>
                        ) : (
                            t('users.disableDialog.confirm')
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};
