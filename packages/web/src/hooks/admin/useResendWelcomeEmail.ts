import { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n';

export function useResendWelcomeEmail() {
    const [isLoading, setIsLoading] = useState(false);
    const { t } = useTranslation('admin');

    const resendEmail = async (userId: string, userEmail: string) => {
        setIsLoading(true);
        try {
            const functions = getFunctions();
            const resendWelcomeEmailFn = httpsCallable(functions, 'resendWelcomeEmail');

            const result = await resendWelcomeEmailFn({ userId });
            const data = result.data as any;

            if (data.success) {
                toast.success(t('users.toasts.resendSuccess', { email: userEmail }));
                return true;
            }
            return false;

        } catch (error: any) {
            console.error('Error resending email:', error);
            toast.error(error.message || t('users.toasts.resendError'));
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    return { resendEmail, isLoading };
}
