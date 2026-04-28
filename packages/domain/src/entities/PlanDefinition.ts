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

        // ── Personal Library quotas (new — Phase 2 RAG model) ──────────────
        // These gate the new business model where users upload their own material
        // and the platform charges for processing + AI tool usage.
        //
        // `libraryDocsLimit`: total documents in the user's personal library at once.
        //     Soft ceiling — warns at 80%, blocks upload at 100%.
        //
        // `pagesProcessedPerMonth`: pages extracted by LlamaParse per month across
        //     all uploads. Main cost driver (extraction). Resets each calendar month.
        //
        // `queriesPerMonth`: chat messages sent to tutors per month. Gemini inference
        //     cost driver. Use -1 for unlimited (e.g. top tier).
        libraryDocsLimit?: number;         // Max docs in personal library (undefined = no quota enforced)
        pagesProcessedPerMonth?: number;   // Pages/month via LlamaParse (undefined = no quota)
        queriesPerMonth?: number;          // Chat messages/month (undefined = no quota, -1 = unlimited)

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

    /**
     * Pages credited to the user's `processingBalance` ONCE when they first
     * activate this subscription (or when re-subscribing from a cancelled
     * state — the webhook tracks idempotency per subscription id). NOT
     * recurring.
     *
     * Per PRICING_PROCESSING_ROADMAP.md Hito 4:
     *   - Free:     0 / 0 (no upload)
     *   - Personal: 2,000 / 0
     *   - Pro:      5,000 / 200
     *   - Equipo:  10,000 / 500
     *
     * Both fields default to 0 when undefined (legacy plans).
     */
    bonusInitial?: {
        standardPages?: number;
        premiumPages?: number;
    };

    // Stripe integration
    /**
     * Stripe Price IDs split by billing cycle. Each plan typically has both a
     * monthly and a yearly price; the UI lets the user pick which one to
     * checkout against. The webhook reverse-resolves a price id to a plan by
     * iterating these objects (cheap — there are <10 plan docs).
     *
     * `monthly` is required (every paid plan must offer monthly billing).
     * `yearly` is optional during the rollout but recommended.
     *
     * @deprecated Older docs may still carry `stripeProductIds: string[]`.
     * The repository coerces them into `{ monthly: <first id> }` on read so
     * existing code keeps working until those docs are migrated.
     */
    stripePriceIds: {
        monthly: string;
        yearly?: string;
    };

    // Metadata
    isActive: boolean; // If plan is available for purchase
    isPublic: boolean; // If visible to users
    isLegacy: boolean; // If plan is deprecated (Free, Enterprise)
    highlightText?: string | null; // Badge text (e.g., "Más Popular")
    sortOrder: number; // Display order
    createdAt: Date;
    updatedAt: Date;
}
