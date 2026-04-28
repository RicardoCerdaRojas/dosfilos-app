import { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n';

type BulkAction = 'disable' | 'enable';

interface BulkResult {
    userId: string;
    success: boolean;
    error?: string;
}

interface BulkResponse {
    results: BulkResult[];
    ok: number;
    failed: number;
}

export function useBulkUserAction() {
    const [isLoading, setIsLoading] = useState(false);
    const { t } = useTranslation('admin');

    const runBulk = async (
        action: BulkAction,
        userIds: string[],
    ): Promise<BulkResponse | null> => {
        setIsLoading(true);
        try {
            const fn = httpsCallable<{ action: BulkAction; userIds: string[] }, BulkResponse>(
                getFunctions(),
                'bulkUserAction',
            );
            const { data } = await fn({ action, userIds });
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
