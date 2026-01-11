/**
 * Domain Model: Plan
 * 
 * Represents a subscription plan in the system
 * Platform-agnostic, framework-independent
 */

export interface Plan {
    id: string;

    // Pricing information
    pricing: {
        currency: string;
        monthly: number;
        yearly?: number;
    };

    // Features and capabilities
    features: string[];
    modules: string[];
    limits: Record<string, number>;

    // Stripe integration
    stripeProductIds: string[];

    // Display and ordering
    sortOrder: number;
    highlightText?: string | null;
    description?: string; // Deprecated - use translations

    // Status flags
    isActive: boolean;
    isPublic: boolean;
    isLegacy: boolean;
}

export interface PlanTranslation {
    planId: string;
    translations: Record<string, {
        name: string;
        description: string;
        features: Record<string, string>;
        modules: Record<string, string>;  // NEW: module translations
        limits: Record<string, string>;   // NEW: limit templates
    }>;
}

/**
 * Localized plan with translations applied
 */
export interface LocalizedPlan extends Plan {
    localizedName: string;
    localizedDescription: string;
    localizedFeatures: Array<{
        id: string;
        label: string;
    }>;
    localizedModules: Array<{  // NEW: translated modules
        id: string;
        label: string;
    }>;
    localizedLimits: Array<{   // NEW: translated limits with values
        key: string;
        value: number;
        label: string;
    }>;
}
