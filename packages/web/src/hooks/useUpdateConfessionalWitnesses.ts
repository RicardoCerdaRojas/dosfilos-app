import { useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n';
import { FirebaseUserProfileRepository } from '@dosfilos/infrastructure';
import type { UpdateConfessionalWitnessesInput } from '@dosfilos/domain';

const repo = new FirebaseUserProfileRepository();

/**
 * Toggles whether all confessional traditions in the catalog act as
 * Testigo 3 historical witnesses (ADR-010). Opt-out requires a written
 * justification — the repo enforces ≥50 chars; this hook surfaces the
 * resulting error as a toast so the user sees feedback.
 */
export function useUpdateConfessionalWitnesses() {
    const [isLoading, setIsLoading] = useState(false);
    const { t } = useTranslation('dashboard');

    const update = async (
        userId: string,
        input: UpdateConfessionalWitnessesInput,
    ): Promise<boolean> => {
        setIsLoading(true);
        try {
            await repo.updateConfessionalWitnesses(userId, input);
            toast.success(
                input.useConfessionalWitnesses
                    ? t('confession.settings.toasts.enabled')
                    : t('confession.settings.toasts.disabled'),
            );
            return true;
        } catch (error: any) {
            console.error('Error updating confessional witnesses:', error);
            toast.error(error.message || t('confession.settings.toasts.error'));
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    return { update, isLoading };
}
