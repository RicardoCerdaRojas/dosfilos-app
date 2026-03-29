import { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { toast } from 'sonner';

export function useDisableUser() {
    const [isLoading, setIsLoading] = useState(false);

    const disableUser = async (userId: string, userEmail: string): Promise<boolean> => {
        setIsLoading(true);
        try {
            const functions = getFunctions();
            const disableUserFn = httpsCallable(functions, 'disableUser');
            await disableUserFn({ userId });
            toast.success(`Usuario ${userEmail} deshabilitado correctamente`);
            return true;
        } catch (error: any) {
            console.error('Error disabling user:', error);
            toast.error(error.message || 'Error al deshabilitar usuario');
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    return { disableUser, isLoading };
}
