import { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { toast } from 'sonner';

export function useEnableUser() {
    const [isLoading, setIsLoading] = useState(false);

    const enableUser = async (userId: string, userEmail: string): Promise<boolean> => {
        setIsLoading(true);
        try {
            const functions = getFunctions();
            const enableUserFn = httpsCallable(functions, 'enableUser');
            await enableUserFn({ userId });
            toast.success(`Usuario ${userEmail} habilitado correctamente`);
            return true;
        } catch (error: any) {
            console.error('Error enabling user:', error);
            toast.error(error.message || 'Error al habilitar usuario');
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    return { enableUser, isLoading };
}
