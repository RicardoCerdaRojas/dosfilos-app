export interface PlanDefinition {
    id: string; // "free", "starter", "pro", "enterprise"
    name: string; // Display name
    description: string; // Plan description
    tier: string; // "starter", "pro", etc.

    // Features & Modules
    features: string[]; // Feature identifiers (e.g., "sermon:create", "sermon:ai_assistant")
    modules: string[]; // Module identifiers (e.g., "module:dashboard", "module:sermones")

    // Usage limits
    limits: {
        // Sermon generation limits
        sermonsPerMonth: number; // Monthly sermon creation limit (all plans)

        // Preaching plans limits
        maxPreachingPlans?: number; // Total limit (Free plan only)
        maxPreachingPlansPerMonth?: number; // Monthly limit (Pro/Team only)

        // Greek Tutor limits
        greekSessionsPerMonth: number; // Monthly Greek Tutor study sessions

        // Library limits
        libraryStorageMB: number; // Storage limit in MB (0 = no access)

        // Legacy/deprecated fields (keep for backwards compatibility)
        aiRequestsPerDay?: number; // AI generation limit per day
        maxMembers?: number; // Team members (future)
    };

    // Pricing
    pricing: {
        currency: string; // "USD"
        monthly: number; // Monthly price
        yearly: number; // Yearly price
    };

    // Stripe integration
    stripeProductIds: string[]; // Array of Stripe Price IDs

    // Metadata
    isActive: boolean; // If plan is available for purchase
    isPublic: boolean; // If visible to users
    sortOrder: number; // Display order
    createdAt: Date;
    updatedAt: Date;
}
