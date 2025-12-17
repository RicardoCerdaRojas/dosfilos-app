/**
 * Domain - Plan Metadata
 * Pure TypeScript types and configuration
 */

export interface PlanMetadata {
    id: string;
    name: string;
    description: string;
    priceMonthly: number;
    stripePriceId: string | null;
    features: string[];
    sortOrder: number;
    isPublic: boolean;
}

export const PLAN_CONFIGS: Record<string, PlanMetadata> = {
    free: {
        id: 'free',
        name: 'Gratis',
        description: 'Para comenzar tu ministerio de predicación',
        priceMonthly: 0,
        stripePriceId: null,
        features: [
            'sermon:create',
            'sermon:export_pdf',
            'library:upload',
        ],
        sortOrder: 0,
        isPublic: true,
    },
    starter: {
        id: 'starter',
        name: 'Starter',
        description: 'Para predicadores que quieren más herramientas',
        priceMonthly: 9.99,
        stripePriceId: 'price_1SR3ILObMCNNnrSDLSAOIeOkd', // Replace with actual ID
        features: [
            'sermon:create',
            'sermon:ai_assistant',
            'sermon:export_pdf',
            'library:upload',
            'library:semantic_search',
        ],
        sortOrder: 1,
        isPublic: true,
    },
    pro: {
        id: 'pro',
        name: 'Pro',
        description: 'Para equipos pastorales y predicadores frecuentes',
        priceMonthly: 24.99,
        stripePriceId: 'price_pro_monthly', // Replace with actual ID
        features: [
            'sermon:create',
            'sermon:ai_assistant',
            'sermon:advanced_homiletics',
            'sermon:export_pdf',
            'sermon:custom_templates',
            'library:upload',
            'library:semantic_search',
        ],
        sortOrder: 2,
        isPublic: true,
    },
    iglesia: {
        id: 'iglesia',
        name: 'Iglesia',
        description: 'Para iglesias y organizaciones con múltiples predicadores',
        priceMonthly: 99,
        stripePriceId: 'price_iglesia_monthly', // Replace with actual ID
        features: [
            'sermon:create',
            'sermon:ai_assistant',
            'sermon:advanced_homiletics',
            'sermon:export_pdf',
            'sermon:custom_templates',
            'library:upload',
            'library:semantic_search',
            'library:unlimited_storage',
            'courses:view',
        ],
        sortOrder: 3,
        isPublic: true,
    },
};

/**
 * Get plan metadata by ID
 * @throws Error if plan not found
 */
export function getPlanMetadata(planId: string): PlanMetadata {
    const plan = PLAN_CONFIGS[planId];
    if (!plan) {
        throw new Error(`Plan not found: ${planId}`);
    }
    return plan;
}

/**
 * Get all public plans
 */
export function getPublicPlans(): PlanMetadata[] {
    return Object.values(PLAN_CONFIGS)
        .filter(plan => plan.isPublic)
        .sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Validate if a plan ID is valid
 */
export function isValidPlan(planId: string): boolean {
    return planId in PLAN_CONFIGS;
}

/**
 * Check if a plan requires payment
 */
export function isPaidPlan(planId: string): boolean {
    const plan = PLAN_CONFIGS[planId];
    return plan ? plan.priceMonthly > 0 : false;
}
