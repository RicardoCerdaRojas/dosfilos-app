import { useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n';
import { adminUserService } from '@dosfilos/application';

export function useDisableUser() {
    const [isLoading, setIsLoading] = useState(false);
    const { t } = useTranslation('admin');

    const disableUser = async (userId: string, userEmail: string): Promise<boolean> => {
        setIsLoading(true);
        try {
            await adminUserService.disableUser(userId);
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
