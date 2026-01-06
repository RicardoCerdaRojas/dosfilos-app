import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@dosfilos/infrastructure';
import { useFirebase } from '@/context/firebase-context';
import { toast } from 'sonner';

/**
 * Hook to verify and manage super admin access
 * Redirects non-admin users to dashboard
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

            try {
                // Check user role in Firestore
                const userDoc = await getDoc(doc(db, 'users', user.uid));

                if (!userDoc.exists()) {
                    setIsAdmin(false);
                    setLoading(false);
                    toast.error('Usuario no encontrado');
                    navigate('/dashboard');
                    return;
                }

                const userData = userDoc.data();
                const userRole = userData.role;

                if (userRole === 'super_admin') {
                    setIsAdmin(true);
                    setLoading(false);
                } else {
                    setIsAdmin(false);
                    setLoading(false);
                    toast.error('No tienes permisos para acceder a esta sección');
                    navigate('/dashboard');
                }
            } catch (error) {
                console.error('Error checking admin access:', error);
                setIsAdmin(false);
                setLoading(false);
                toast.error('Error al verificar permisos');
                navigate('/dashboard');
            }
        };

        checkAdminAccess();
    }, [user, navigate]);

    return { isAdmin, loading };
}
