import { useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n';
import { adminUserService, type BulkUserAction, type BulkUserActionResponse } from '@dosfilos/application';

export function useBulkUserAction() {
    const [isLoading, setIsLoading] = useState(false);
    const { t } = useTranslation('admin');

    const runBulk = async (
        action: BulkUserAction,
        userIds: string[],
    ): Promise<BulkUserActionResponse | null> => {
        setIsLoading(true);
        try {
            const data = await adminUserService.bulkUserAction(action, userIds);
            if (data.failed === 0) {
                toast.success(
                    t('users.bulkActions.successAll', { count: data.ok }),
                );
            } else if (data.ok > 0) {
                toast.warning(
                    t('users.bulkActions.successPartial', { ok: data.ok, failed: data.failed }),
                );
            } else {
                toast.error(t('users.bulkActions.errorAll'));
            }
            return data;
        } catch (err: any) {
            console.error('[useBulkUserAction]', err);
            toast.error(err?.message ?? t('users.bulkActions.errorAll'));
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    return { runBulk, isLoading };
}
