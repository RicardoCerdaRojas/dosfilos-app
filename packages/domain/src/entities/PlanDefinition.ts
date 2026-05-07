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

        // Hebrew Tutor limits — gated identically to Greek (entry-tier hook).
        // Free / Personal get a small monthly cap so curious users can sample
        // the differentiator and have a concrete reason to upgrade. Pro+ use
        // -1 for unlimited.
        hebrewSessionsPerMonth?: number;

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
        /**
         * @deprecated Replaced by `standardPagesPerMonth` + `premiumPagesPerMonth`
         * (the two-bucket model). The repository keeps this field in sync as
         * the sum of standard + premium for any pre-refactor consumer that
         * still reads it; new code should use the per-mode fields directly.
         */
        pagesProcessedPerMonth?: number;
        /**
         * Plan-included monthly quota for Gemini Flash (standard) extractions.
         * Reset on each Stripe billing-cycle invoice (no rollover). The
         * `setPlanQuota()` admin helper writes this value into the user's
         * `processingBalance.planStandardPages` bucket. Undefined = no plan
         * quota (the user falls back to packs only).
         */
        standardPagesPerMonth?: number;
        /**
         * Plan-included monthly quota for LlamaParse (premium) extractions.
         * Same renewal semantics as `standardPagesPerMonth`. Premium pages
         * are scarcer in every plan because they have higher unit cost and
         * are the natural upsell for the credit-pack tier.
         */
        premiumPagesPerMonth?: number;
        /**
         * Plan-included monthly USD allowance for the exegesis module.
         * Resets on each Stripe billing-cycle invoice (no rollover) —
         * same semantics as `standardPagesPerMonth`. Charged in USD
         * (not pages) because each exegesis operation has a different
         * LLM cost; the UI displays "estudios" via `STUDY_UNIT_USD`.
         *
         * Per EXEGESIS_PRICING_INTEGRATION.md §3.4:
         *   - Free:     0 (module gated)
         *   - Personal: 0 (module gated, upgrade to Pro to unlock)
         *   - Pro:      10 (≈ 5 estudios)
         *   - Equipo:  30 (≈ 15 estudios)
         *
         * Undefined = no plan allowance (the user falls back to packs only).
         */
        exegesisUsdPerMonth?: number;
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
        /**
         * Optional one-shot exegesis USD bonus credited on first
         * subscription activation. Currently unused (the rollout grants
         * exegesis only via the recurring monthly allowance), but the
         * field exists so the webhook can apply a "first-month bonus"
         * pack later without a schema migration.
         */
        exegesisUsd?: number;
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
