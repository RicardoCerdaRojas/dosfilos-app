import { useCallback, useEffect, useState } from 'react';
import { FirebaseUserProfileRepository } from '@dosfilos/infrastructure';
import type { User } from '@dosfilos/domain';
import { useFirebase } from '@/context/firebase-context';

const userProfileRepository = new FirebaseUserProfileRepository();

/**
 * Reads the user profile from Firestore (subscription, metadata,
 * featureFlags, etc.) — distinct from the Firebase Auth user which only
 * carries uid + email + displayName.
 *
 * Realtime: subscribes via `subscribeProfile` (onSnapshot) so changes
 * made elsewhere — admin feature-flag toggles, Stripe webhook plan
 * updates, `/settings/confession` saves — propagate live without a
 * manual page reload. This matters for feature gating: an admin flipping
 * `pastoral_word_study` now reflects in the open session immediately,
 * instead of staying stale until the next hard refresh.
 *
 * `refetch()` is retained for API compatibility with existing callers
 * (e.g. the confession settings save flow). With the live subscription
 * it's effectively a no-op success, but it still resolves the current
 * profile so callers awaiting it don't break.
 */
export function useUserProfile() {
    const { user } = useFirebase();
    const [profile, setProfile] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const refetch = useCallback(async () => {
        if (!user?.uid) return null;
        try {
            const p = await userProfileRepository.getProfile(user.uid);
            setProfile(p);
            return p;
        } catch (err) {
            console.error('[useUserProfile.refetch]', err);
            return null;
        }
    }, [user?.uid]);

    useEffect(() => {
        if (!user?.uid) {
            setProfile(null);
            setLoading(false);
            return;
        }
        setLoading(true);
        const unsubscribe = userProfileRepository.subscribeProfile(
            user.uid,
            (p) => {
                setProfile(p);
                setLoading(false);
            },
            (err) => {
                console.error('[useUserProfile.subscribe]', err);
                setLoading(false);
            },
        );
        return () => unsubscribe();
    }, [user?.uid]);

    return { profile, loading, refetch };
}
