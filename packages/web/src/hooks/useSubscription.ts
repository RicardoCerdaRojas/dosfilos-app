import { useFirebase } from '@/context/firebase-context';
import { Subscription } from '@dosfilos/domain';
import { SubscriptionService } from '@dosfilos/application';
import {
    FirebaseUserProfileRepository,
    FirebasePlanRepository,
} from '@dosfilos/infrastructure';
import { useState, useEffect, useMemo } from 'react';

// Singleton instances
const userProfileRepository = new FirebaseUserProfileRepository();
const planRepository = new FirebasePlanRepository();
const subscriptionService = new SubscriptionService(userProfileRepository, planRepository);

/**
 * Subscribes to the current user's profile doc and exposes the live `subscription`
 * branch. Previously this hook read `user.subscription` off the Firebase Auth user,
 * which has no `subscription` field — so every consumer (sidebar plan chip, etc.)
 * silently fell back to `null` and rendered the user as Free regardless of their
 * actual plan. Now uses `subscribeProfile` (onSnapshot) so admin-driven plan
 * changes and Stripe webhook updates reflect without a refresh.
 */
export function useSubscription() {
    const { user } = useFirebase();
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [availablePlans, setAvailablePlans] = useState<any[]>([]);

    useEffect(() => {
        if (!user?.uid) {
            setSubscription(null);
            return;
        }
        const unsubscribe = userProfileRepository.subscribeProfile(
            user.uid,
            (profile) => {
                setSubscription(profile?.subscription ?? null);
            },
            (err) => {
                console.error('[useSubscription] profile subscribe error:', err);
            },
        );
        return () => unsubscribe();
    }, [user?.uid]);

    useEffect(() => {
        if (!user) {
            setAvailablePlans([]);
            return;
        }

        const loadPlans = async () => {
            try {
                const plans = await subscriptionService.getAvailablePlans(user.uid);
                setAvailablePlans(plans);
            } catch (error) {
                console.error('Error loading plans:', error);
            }
        };

        loadPlans();
    }, [user]);

    const canUpgradeTo = useMemo(() => {
        return async (targetPlanId: string): Promise<boolean> => {
            if (!user) return false;
            return subscriptionService.canUpgradeTo(user.uid, targetPlanId);
        };
    }, [user]);

    return {
        subscription,
        availablePlans,
        canUpgradeTo,
    };
}
