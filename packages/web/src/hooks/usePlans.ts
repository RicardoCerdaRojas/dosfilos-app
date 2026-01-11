/**
 * usePlans Hook - Refactored
 * 
 * Centralized hook for accessing subscription plans
 * Uses clean architecture: PlanService + FirebasePlanRepository
 */

import { useState, useEffect, useMemo } from 'react';
import { PlanService, PlanDefinition, LocalizedPlan } from '@dosfilos/domain';
import { FirebasePlanRepository } from '@dosfilos/infrastructure';
import { useTranslation } from '@/i18n';

/**
 * Main hook for accessing plans
 * Automatically applies translations based on current language
 */
export function usePlans() {
    const { i18n } = useTranslation();
    const [plans, setPlans] = useState<LocalizedPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // Initialize service (Dependency Injection)
    const planService = useMemo(
        () => new PlanService(new FirebasePlanRepository()),
        []
    );

    useEffect(() => {
        let mounted = true;

        const loadPlans = async () => {
            try {
                setLoading(true);

                // Get localized plans from service
                const localizedPlans = await planService.getAvailablePlansWithTranslations(
                    i18n.language
                );

                if (mounted) {
                    setPlans(localizedPlans);
                    setError(null);
                }
            } catch (err) {
                console.error('Error loading plans:', err);
                if (mounted) {
                    setError(err as Error);
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        loadPlans();

        return () => {
            mounted = false;
        };
    }, [planService, i18n.language]);

    return {
        plans,
        loading,
        error,
        planService // Expose service for advanced usage
    };
}

/**
 * Hook to get the most popular plan
 */
export function usePopularPlan() {
    const { plans, loading } = usePlans();
    const popularPlan = useMemo(
        () => plans.find(p => p.highlightText),
        [plans]
    );

    return { popularPlan, loading };
}

/**
 * Hook to check if a user's plan is legacy
 */
export function useIsLegacyUser(userPlanId?: string) {
    const [isLegacy, setIsLegacy] = useState(false);
    const [loading, setLoading] = useState(true);

    const planService = useMemo(
        () => new PlanService(new FirebasePlanRepository()),
        []
    );

    useEffect(() => {
        if (!userPlanId) {
            setIsLegacy(false);
            setLoading(false);
            return;
        }

        planService
            .isLegacyPlan(userPlanId)
            .then(setIsLegacy)
            .finally(() => setLoading(false));
    }, [userPlanId, planService]);

    return { isLegacy, loading };
}

/**
 * Hook to get a single plan by ID with translations
 */
export function usePlan(planId?: string) {
    const { i18n } = useTranslation();
    const [plan, setPlan] = useState<LocalizedPlan | null>(null);
    const [loading, setLoading] = useState(true);

    const planService = useMemo(
        () => new PlanService(new FirebasePlanRepository()),
        []
    );

    useEffect(() => {
        if (!planId) {
            setPlan(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        planService
            .getLocalizedPlan(planId, i18n.language)
            .then(setPlan)
            .finally(() => setLoading(false));
    }, [planId, i18n.language, planService]);

    return { plan, loading };
}

/**
 * Legacy interface for backward compatibility
 * Matches the old FirestorePlan interface
 */
export interface FirestorePlan extends PlanDefinition {
    // Add any additional fields that were in the old interface
}


/**
 * Get Stripe price ID for a plan
 * Helper function for checkout flows
 * Accepts both PlanDefinition and LocalizedPlan
 */
export function getPlanPriceId(plan: PlanDefinition | LocalizedPlan): string | null {
    return plan.stripeProductIds?.[0] || null;
}

/**
 * Check if a plan requires payment
 */
export function isPaidPlan(planId: string): boolean {
    return planId !== 'free';
}
