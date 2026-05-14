import { useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n';
import { adminUserService } from '@dosfilos/application';

export function useDeleteUser() {
    const [isLoading, setIsLoading] = useState(false);
    const { t } = useTranslation('admin');

    const deleteUser = async (userId: string) => {
        setIsLoading(true);
        try {
            await adminUserService.deleteUser(userId);
            toast.success(t('users.toasts.deleteSuccess'));
            return true;
        } catch (error: any) {
            console.error('Error deleting user:', error);
            toast.error(error.message || t('users.toasts.deleteError'));
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    return { deleteUser, isLoading };
}
