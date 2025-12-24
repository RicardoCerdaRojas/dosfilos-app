import { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { toast } from 'sonner';

export function useResendWelcomeEmail() {
    const [isLoading, setIsLoading] = useState(false);

    const resendEmail = async (userId: string, userEmail: string) => {
        setIsLoading(true);
        try {
            const functions = getFunctions();
            const resendWelcomeEmailFn = httpsCallable(functions, 'resendWelcomeEmail');

            const result = await resendWelcomeEmailFn({ userId });
            const data = result.data as any;

            if (data.success) {
                toast.success(`Email enviado correctamente a ${userEmail}`);
                return true;
            }
            return false;

        } catch (error: any) {
            console.error('Error resending email:', error);
            toast.error(error.message || 'Error al reenviar el correo');
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    return { resendEmail, isLoading };
}
