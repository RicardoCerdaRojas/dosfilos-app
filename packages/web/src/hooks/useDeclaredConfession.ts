import { useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n';
import { FirebaseUserProfileRepository } from '@dosfilos/infrastructure';
import type {
    ConfessionVisibility,
    DeclaredConfessionId,
} from '@dosfilos/domain';

const repo = new FirebaseUserProfileRepository();

/**
 * Persists the pastor's declared confession (ADR-007). Writes directly
 * to the user's profile doc through the repository — the Firestore rule
 * `allow write: if isOwner(userId)` already covers self-mutation, so no
 * Cloud Function is required. `confessionAffirmedAt` is stamped
 * server-side on each write so the audit trail records every change.
 */
export function useDeclaredConfession() {
    const [isLoading, setIsLoading] = useState(false);
    const { t } = useTranslation('dashboard');

    const declare = async (
        userId: string,
        declaredConfession: DeclaredConfessionId,
        visibility: ConfessionVisibility = 'private',
    ): Promise<boolean> => {
        setIsLoading(true);
        try {
            await repo.updateDeclaredConfession(userId, {
                declaredConfession,
                confessionVisibility: visibility,
            });
            toast.success(t('onboarding.confession.toasts.success'));
            return true;
        } catch (error: any) {
            console.error('Error declaring confession:', error);
            toast.error(error.message || t('onboarding.confession.toasts.error'));
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    return { declare, isLoading };
}
