import { useFirebase } from '@/context/firebase-context';
import {
    Subscription,
} from '@dosfilos/domain';
import {
    SubscriptionService
} from '@dosfilos/application';
import {
    FirebaseUserProfileRepository,
    FirebasePlanRepository
} from '@dosfilos/infrastructure';
import { useState, useEffect, useMemo } from 'react';

// Singleton instances
const userProfileRepository = new FirebaseUserProfileRepository();
const planRepository = new FirebasePlanRepository();
const subscriptionService = new SubscriptionService(userProfileRepository, planRepository);

export function useSubscription() {
    const { user } = useFirebase();
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [availablePlans, setAvailablePlans] = useState<any[]>([]);

    // Load subscription
    useEffect(() => {
        if (!user) {
            setSubscription(null);
            return;
        }

        setSubscription(user.subscription ?? null);
    }, [user]);

    // Load available plans
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
