import { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n';

export function useDisableUser() {
    const [isLoading, setIsLoading] = useState(false);
    const { t } = useTranslation('admin');

    const disableUser = async (userId: string, userEmail: string): Promise<boolean> => {
        setIsLoading(true);
        try {
            const functions = getFunctions();
            const disableUserFn = httpsCallable(functions, 'disableUser');
            await disableUserFn({ userId });
            toast.success(t('users.toasts.disableSuccess', { email: userEmail }));
            return true;
        } catch (error: any) {
            console.error('Error disabling user:', error);
            toast.error(error.message || t('users.toasts.disableError'));
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    return { disableUser, isLoading };
}
