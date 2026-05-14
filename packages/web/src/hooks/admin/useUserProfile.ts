import { useEffect, useState } from 'react';
import { adminUserQueryService } from '@dosfilos/application';
import type { User } from '@dosfilos/domain';

/**
 * Subscribes to a single user document in real time. Used by the admin user
 * detail page so that mutations (grant credits, extend trial, change plan)
 * surface in the UI without a manual refetch.
 *
 * Firestore SDK + User entity hydration live in
 * `adminUserQueryService.subscribeUser` (compliance C7.3); this hook
 * is a thin React adapter.
 */
export function useUserProfile(userId: string | undefined) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!userId) {
            setUser(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        const unsub = adminUserQueryService.subscribeUser(
            userId,
            (next) => {
                if (!next) {
                    setUser(null);
                    setError('User not found');
                    setLoading(false);
                    return;
                }
                setUser(next);
                setError(null);
                setLoading(false);
            },
            (err) => {
                console.error('[useUserProfile]', err);
                setError(err.message);
                setLoading(false);
            },
        );

        return () => unsub();
    }, [userId]);

    return { user, loading, error };
}
