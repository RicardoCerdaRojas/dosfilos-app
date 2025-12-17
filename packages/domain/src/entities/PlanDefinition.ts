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
        aiRequestsPerDay: number; // AI generation limit per day
        libraryStorageMB: number; // Storage limit in MB
        maxMembers: number; // Team members (future)
        sermonsPerMonth: number; // Sermon creation limit
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
