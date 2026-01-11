/**
 * Domain Service: PlanService
 * 
 * Business logic for plan operations
 * Single Responsibility: Plan-related business rules
 */

import type { IPlanRepository } from '../repositories/IPlanRepository';
import type { Plan, LocalizedPlan, PlanTranslation } from '../models/Plan';

export class PlanService {
    constructor(private planRepository: IPlanRepository) { }

    /**
     * Get all available plans for new subscriptions
     * (public, active, non-legacy plans, sorted by sortOrder)
     */
    async getAvailablePlans(): Promise<Plan[]> {
        const plans = await this.planRepository.getPublicPlans();
        return plans
            .filter(p => p.isActive && !p.isLegacy)
            .sort((a, b) => a.sortOrder - b.sortOrder);
    }

    /**
     * Get the plan marked as most popular
     */
    async getPopularPlan(): Promise<Plan | null> {
        const plans = await this.getAvailablePlans();
        return plans.find(p => p.highlightText) || null;
    }

    /**
     * Get a specific plan by ID
     */
    async getPlanById(planId: string): Promise<Plan | null> {
        return this.planRepository.getById(planId);
    }

    /**
     * Check if a user's plan is legacy
     */
    async isLegacyPlan(planId: string): Promise<boolean> {
        const plan = await this.planRepository.getById(planId);
        return plan?.isLegacy || false;
    }

    /**
     * Check if user can access a specific feature
     */
    async canAccessFeature(userPlanId: string, featureId: string): Promise<boolean> {
        const plan = await this.planRepository.getById(userPlanId);
        return plan?.features.includes(featureId) || false;
    }

    /**
     * Get localized plan with translations applied
     */
    async getLocalizedPlan(planId: string, locale: string): Promise<LocalizedPlan | null> {
        const plan = await this.planRepository.getById(planId);
        if (!plan) return null;

        const translation = await this.planRepository.getTranslations(planId, locale);

        // Fallback to plan ID if no translation
        const localizedName = translation?.translations[locale]?.name || plan.id;
        const localizedDescription = translation?.translations[locale]?.description || plan.description || '';

        // Translate features
        const localizedFeatures = plan.features.map(featureId => ({
            id: featureId,
            label: translation?.translations[locale]?.features[featureId] || featureId
        }));

        // Translate modules (NEW)
        const localizedModules = plan.modules.map(moduleId => ({
            id: moduleId,
            label: translation?.translations[locale]?.modules?.[moduleId] || moduleId
        }));

        // Translate limits (NEW)
        const localizedLimits = Object.entries(plan.limits)
            .filter(([_, value]) => value !== undefined && value !== null)
            .map(([key, value]) => {
                let templateKey = key;
                let displayValue = value as number;

                // Handle unlimited cases (value === 999)
                if (displayValue === 999) {
                    templateKey = `${key}_unlimited`;
                }
                // Handle GB conversion for storage
                else if (key === 'libraryStorageMB' && displayValue >= 1000) {
                    templateKey = `${key}_GB`;
                    displayValue = displayValue / 1000;
                }
                // Handle plural for maxMembers
                else if (key === 'maxMembers' && displayValue > 1) {
                    templateKey = `${key}_plural`;
                }

                const template = translation?.translations[locale]?.limits?.[templateKey] || `${key}: {count}`;
                const label = template.replace('{count}', String(displayValue));

                return { key, value: value as number, label };
            });

        return {
            ...plan,
            localizedName,
            localizedDescription,
            localizedFeatures,
            localizedModules,
            localizedLimits
        };
    }

    /**
     * Get all available plans with translations
     */
    async getAvailablePlansWithTranslations(locale: string): Promise<LocalizedPlan[]> {
        const plans = await this.getAvailablePlans();

        const localizedPlans = await Promise.all(
            plans.map(plan => this.getLocalizedPlan(plan.id, locale))
        );

        return localizedPlans.filter((p): p is LocalizedPlan => p !== null);
    }

    /**
     * Get Stripe price ID for a plan
     */
    async getStripePriceId(planId: string): Promise<string | null> {
        const plan = await this.planRepository.getById(planId);
        return plan?.stripeProductIds?.[0] || null;
    }
}
