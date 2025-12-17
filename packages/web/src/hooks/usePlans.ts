import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@dosfilos/infrastructure';

/**
 * Plan data loaded from Firestore
 * Matches the structure in Firestore plans collection
 */
export interface FirestorePlan {
    id: string;
    name: string;
    description: string;
    pricing: {
        currency: string;
        monthly: number;
        yearly?: number;
    };
    stripeProductIds: string[];
    features: string[];
    isActive: boolean;
    isPublic: boolean;
    sortOrder: number;
    highlightText?: string;
}

/**
 * Hook to load plans from Firestore
 * Single source of truth for plan data
 */
export function usePlans() {
    const [plans, setPlans] = useState<FirestorePlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const loadPlans = async () => {
            try {
                setLoading(true);
                const plansRef = collection(db, 'plans');
                const q = query(plansRef, where('isActive', '==', true));
                const snapshot = await getDocs(q);

                const loadedPlans = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                })) as FirestorePlan[];

                // Sort by sortOrder
                loadedPlans.sort((a, b) => a.sortOrder - b.sortOrder);

                setPlans(loadedPlans);
                setError(null);
            } catch (err) {
                console.error('Error loading plans:', err);
                setError(err as Error);
            } finally {
                setLoading(false);
            }
        };

        loadPlans();
    }, []);

    return { plans, loading, error };
}

/**
 * Get Stripe price ID for a plan
 */
export function getPlanPriceId(plan: FirestorePlan): string | null {
    return plan.stripeProductIds?.[0] || null;
}

/**
 * Check if a plan requires payment
 */
export function isPaidPlan(planId: string): boolean {
    return planId !== 'free';
}
