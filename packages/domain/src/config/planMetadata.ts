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
    hasFreeTrial: boolean;
    trialDays: number;
}

export const PLAN_CONFIGS: Record<string, PlanMetadata> = {
    basic: {
        id: 'basic',
        name: 'Basic',
        description: 'Para comenzar tu ministerio de predicación',
        priceMonthly: 9.99,
        stripePriceId: 'price_1Snh3X08MCNNnSDL4izMKQex',
        features: [
            'sermon:create',
            'sermon:export_pdf',
            'library:upload',
        ],
        sortOrder: 0,
        isPublic: true,
        hasFreeTrial: true,
        trialDays: 30,
    },
    pro: {
        id: 'pro',
        name: 'Pro',
        description: 'Para pastores que predican regularmente',
        priceMonthly: 14.99,
        stripePriceId: 'price_1Snh5U08MCNNnSDLVggbHmWm',
        features: [
            'sermon:create',
            'sermon:ai_assistant',
            'sermon:export_pdf',
            'library:upload',
            'library:semantic_search',
        ],
        sortOrder: 1,
        isPublic: true,
        hasFreeTrial: true,
        trialDays: 30,
    },
    team: {
        id: 'team',
        name: 'Team',
        description: 'Para equipos pastorales e iglesias',
        priceMonthly: 24.99,
        stripePriceId: 'price_1SgDiK08MCNNnSDL3mCVFwl4',
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
        hasFreeTrial: true,
        trialDays: 30,
    },
    // Legacy plans - keep for backward compatibility
    free: {
        id: 'free',
        name: 'Gratis (Legacy)',
        description: 'Plan legacy - migrar a Basic',
        priceMonthly: 0,
        stripePriceId: null,
        features: [
            'sermon:create',
            'sermon:export_pdf',
            'library:upload',
        ],
        sortOrder: 99,
        isPublic: false,
        hasFreeTrial: false,
        trialDays: 0,
    },
    starter: {
        id: 'starter',
        name: 'Pro (Legacy)',
        description: 'Plan legacy - migrar a Pro',
        priceMonthly: 9.99,
        stripePriceId: 'price_1SgDfo08MCNNnSDLK3WLKKb9',
        features: [
            'sermon:create',
            'sermon:ai_assistant',
            'sermon:export_pdf',
            'library:upload',
            'library:semantic_search',
        ],
        sortOrder: 99,
        isPublic: false,
        hasFreeTrial: false,
        trialDays: 0,
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
