import { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { toast } from 'sonner';

export function useDeleteUser() {
    const [isLoading, setIsLoading] = useState(false);

    const deleteUser = async (userId: string) => {
        setIsLoading(true);
        try {
            const functions = getFunctions();
            const deleteUserFn = httpsCallable(functions, 'deleteUser');

            await deleteUserFn({ userId });

            toast.success('Usuario eliminado permanentemente');
            return true;
        } catch (error: any) {
            console.error('Error deleting user:', error);
            toast.error(error.message || 'Error al eliminar usuario');
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    return { deleteUser, isLoading };
}
