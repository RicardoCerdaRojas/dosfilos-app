import { useEffect, useState } from 'react';
import { FirebaseUserProfileRepository } from '@dosfilos/infrastructure';
import type { User } from '@dosfilos/domain';
import { useFirebase } from '@/context/firebase-context';

const userProfileRepository = new FirebaseUserProfileRepository();

/**
 * Reads the user profile from Firestore (subscription, metadata,
 * etc.) — distinct from the Firebase Auth user which only carries
 * uid + email + displayName.
 *
 * Used across the dashboard to surface plan + billing context. Single
 * fetch on mount; reactive consumers (the BalanceBanner, etc.)
 * subscribe via React Query separately when they need real-time data.
 */
export function useUserProfile() {
    const { user } = useFirebase();
    const [profile, setProfile] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.uid) {
            setProfile(null);
            setLoading(false);
            return;
        }
        let cancelled = false;
        userProfileRepository
            .getProfile(user.uid)
            .then((p) => { if (!cancelled) setProfile(p); })
            .catch((err) => console.error('[useUserProfile]', err))
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [user?.uid]);

    return { profile, loading };
}
