import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '@dosfilos/application';
import { useFirebase } from '@/context/firebase-context';
import { toast } from 'sonner';

/**
 * Hook to verify and manage super admin access.
 * Redirects non-admin users to dashboard. Role lookup goes through
 * `authService.getUserRole` so the Firestore SDK stays out of this
 * presenter (compliance C7.3).
 */
export function useAdminAuth() {
    const { user } = useFirebase();
    const navigate = useNavigate();
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAdminAccess = async () => {
            if (!user) {
                setIsAdmin(false);
                setLoading(false);
                navigate('/dashboard');
                return;
            }

            const role = await authService.getUserRole(user.uid);
            if (role === null) {
                setIsAdmin(false);
                setLoading(false);
                toast.error('Usuario no encontrado');
                navigate('/dashboard');
                return;
            }

            if (role === 'super_admin') {
                setIsAdmin(true);
                setLoading(false);
            } else {
                setIsAdmin(false);
                setLoading(false);
                toast.error('No tienes permisos para acceder a esta sección');
                navigate('/dashboard');
            }
        };

        checkAdminAccess();
    }, [user, navigate]);

    return { isAdmin, loading };
}
