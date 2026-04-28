import { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n';

export function useEnableUser() {
    const [isLoading, setIsLoading] = useState(false);
    const { t } = useTranslation('admin');

    const enableUser = async (userId: string, userEmail: string): Promise<boolean> => {
        setIsLoading(true);
        try {
            const functions = getFunctions();
            const enableUserFn = httpsCallable(functions, 'enableUser');
            await enableUserFn({ userId });
            toast.success(t('users.toasts.enableSuccess', { email: userEmail }));
            return true;
        } catch (error: any) {
            console.error('Error enabling user:', error);
            toast.error(error.message || t('users.toasts.enableError'));
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    return { enableUser, isLoading };
}
