import { Subscription } from './Subscription';
import type { SupportedLanguage } from '../types/i18n';

/**
 * User role enumeration
 */
export type UserRole = 'user' | 'super_admin';

/**
 * User analytics tracking data
 */
export interface UserAnalytics {
    // Activity metrics
    lastLoginAt: Date;
    lastActivityAt: Date;
    loginCount: number;
    sessionCount: number;
    totalSessionDuration: number; // in minutes

    // Feature usage - Content counters
    sermonsCreated: number;
    sermonsPublished: number;        // NEW: Only published sermons
    sermonsGenerated: number;        // AI-generated sermons
    greekTutorSessions: number;
    greekTutorCompleted: number;     // NEW: Completed sessions
    libraryUploads: number;
    seriesCreated: number;           // NEW: Sermon series
    preachingPlansCreated: number;   // NEW: Preaching plans

    // Important timestamps
    firstSermonAt?: Date;
    firstAIGenerationAt?: Date;
    lastContentCreatedAt?: Date;     // NEW: Last content creation

    // Daily activity tracking (resets daily)
    contentCreatedToday: number;     // NEW: Counter for today's content
    contentCreatedThisWeek: number;  // NEW: Counter for this week's content

    // Engagement metrics (computed)
    engagementScore: number; // 0-100
    riskLevel: 'low' | 'medium' | 'high'; // Churn risk
}

/**
 * Processing balance for the credit-pack model (see PRICING_PROCESSING_ROADMAP).
 *
 * Two extractors with different unit economics (Gemini Flash standard vs
 * LlamaParse premium) × two origin buckets (plan-monthly vs prepaid pack):
 *
 *   - `plan{Standard,Premium}Pages` — quota included in the user's monthly
 *     subscription. RESET to the plan's `{standard,premium}PagesPerMonth`
 *     on each billing-cycle invoice (no rollover; unused pages are lost
 *     at month boundary). Initially seeded by `bonusInitial` at activation
 *     so the user can start using on day 1.
 *   - `pack{Standard,Premium}Pages` — pages purchased via credit packs.
 *     Persistent (no automatic reset). Don't expire for 12 months from
 *     purchase per the legal copy in the dialog.
 *
 * Consumption order is plan FIRST, then pack — the plan resets monthly so
 * letting it expire wastes value, while pack pages persist. This is also
 * the spirit of how SaaS plans typically advertise "X pages included":
 * the included quota gets used before paid extras kick in.
 *
 * The legacy `*Available` fields (kept for backward-compat with admin UI,
 * Library banner, etc.) are TOTAL = plan + pack. Writers MUST keep them
 * in sync — `ProcessingBalanceService.recomputeAvailable()` is the
 * canonical helper.
 */
export interface ProcessingBalance {
    /** Plan-included pages — reset monthly by Stripe invoice webhook. */
    planStandardPages: number;
    planPremiumPages: number;
    /** Pack-purchased pages — persistent, 12-month expiration window. */
    packStandardPages: number;
    packPremiumPages: number;
    /**
     * Aggregate available = plan + pack. Kept as concrete fields (not
     * computed) because Firestore doesn't support derived properties and
     * existing consumers (admin UI, Library banner, gating in
     * LibraryManager) read these directly. Writers update them alongside
     * the underlying buckets.
     */
    standardPagesAvailable: number;
    premiumPagesAvailable: number;
    /** Lifetime spent counters for analytics / dashboard. */
    standardSpentTotal: number;
    premiumSpentTotal: number;

    // ── Exégesis bucket (added 2026-05 — see EXEGESIS_PRICING_INTEGRATION.md) ──
    //
    // Tracks LLM spend for the exegesis module in USD (not pages).
    // Surfaces in the UI as "estudios" via STUDY_UNIT_USD = $2 / study,
    // but the canonical bucket is USD because each operation has a
    // different LLM cost (analyzeVerseCanonically ~$0.10, composer
    // académico ~$0.20, etc.). All four fields default to 0 for users
    // on plans that don't include exegesis (Free / Personal); the
    // reserve use case rejects with QuotaExceededError when the UC
    // tries to spend against an empty bucket.

    /** Plan-included exégesis $USD — reset monthly by Stripe invoice webhook. */
    planExegesisUsd?: number;
    /** Pack-purchased exégesis $USD — persistent, no expiration on the value (pack itself may expire 12mo). */
    packExegesisUsd?: number;
    /** Aggregate available = plan + pack. Same dual-write semantics as the page buckets. */
    exegesisUsdAvailable?: number;
    /** Lifetime exégesis spend in USD. Useful for telemetry + breakdown drawer. */
    exegesisSpentTotalUsd?: number;

    /** Last time the balance changed, used in admin/usage dashboards. */
    updatedAt?: Date;
}

/**
 * User metadata for tracking source and context
 */
export interface UserMetadata {
    source: 'organic' | 'referral' | 'campaign';
    referralCode?: string;
    utmParams?: Record<string, string>;
    deviceInfo?: {
        platform: string;
        browser: string;
    };
}

/**
 * Canonical list of feature flags toggleable per-user. Add new entries here
 * so consumers (`useFeatureFlag`) get a narrow union and the admin UI can
 * enumerate them.
 *
 * Defaults are `false` when absent — code must treat missing flags as off.
 */
export const FEATURE_FLAG_NAMES = [
    /**
     * Gates the Pastoral Fidelity reformed wizard (six-step spine, three
     * witnesses, claim/source fidelity, etc.). When false the user stays on
     * the legacy sermon generator surface. Phase 0 of the initiative wires
     * this flag; subsequent phases consume it.
     */
    'pastoral_fidelity_flow',
] as const;

export type FeatureFlagName = (typeof FEATURE_FLAG_NAMES)[number];

export type FeatureFlags = Partial<Record<FeatureFlagName, boolean>>;

/**
 * Declared confessional identity (ADR-007). Free-form string so we can
 * accept any `Confession.id` from the catalog plus the synthetic
 * `'non-confessional'` option for pastors who don't subscribe to a
 * historic confession.
 */
export type DeclaredConfessionId = string;

/**
 * `'non-confessional'` is the only non-catalog value Phase 0 ships. The
 * three-witness mechanism treats it as "no Testigo 3" — no doctrinal
 * gate, only the cross-reference + claim/source witnesses fire.
 */
export const NON_CONFESSIONAL: DeclaredConfessionId = 'non-confessional';

/**
 * Visibility of a pastor's declared confession. Default `'private'`
 * per ADR-007 § Q3. `'public-in-profile'` becomes available once a
 * public pastoral profile feature lands; until then the toggle is
 * dormant.
 */
export type ConfessionVisibility = 'private' | 'public-in-profile';

export interface User {
    id: string;
    email: string;
    displayName: string | null;
    photoURL: string | null;

    // Account status (soft disable/enable)
    status?: 'active' | 'disabled';

    // Role (for admin access)
    role?: UserRole;

    // Subscription fields
    stripeCustomerId?: string;    // Stripe customer ID (at root level)
    subscription?: Subscription;  // Current subscription details

    // Processing balance (credit-pack model)
    processingBalance?: ProcessingBalance;

    /**
     * UI + AI output language. Drives both the i18n bundle picked by the client
     * and the locale resolved for tutor/orchestrator system prompts. Stored at
     * the user-doc level (not under metadata) so it can be read in a single
     * Firestore round-trip from any AI use-case. Undefined = inherit
     * `DEFAULT_LANGUAGE` from `domain/types/i18n.ts`.
     */
    preferredLanguage?: SupportedLanguage;

    // Analytics & Engagement
    analytics?: UserAnalytics;

    // Metadata
    metadata?: UserMetadata;

    /**
     * Per-user feature toggles. Mutated only via the admin callable
     * `setUserFeatureFlags`; clients read but never write. See
     * `FEATURE_FLAG_NAMES` for the canonical list.
     */
    featureFlags?: FeatureFlags;

    /**
     * Pastoral Fidelity (ADR-007) — declared confessional identity.
     * Persisted from the onboarding wizard or `/settings/confession`.
     * Powers Testigo 3 in the three-witness mechanism (Phase 2).
     */
    declaredConfession?: DeclaredConfessionId;
    confessionAffirmedAt?: Date;
    confessionVisibility?: ConfessionVisibility;

    createdAt: Date;
    updatedAt: Date;
}

export class UserEntity implements User {
    constructor(
        public id: string,
        public email: string,
        public displayName: string | null = null,
        public photoURL: string | null = null,
        public stripeCustomerId?: string,
        public subscription?: Subscription,
        public role?: UserRole,
        public analytics?: UserAnalytics,
        public metadata?: UserMetadata,
        public createdAt: Date = new Date(),
        public updatedAt: Date = new Date(),
        public status?: 'active' | 'disabled',
    ) { }

    static create(data: Partial<User> & { id: string; email: string }): UserEntity {
        return new UserEntity(
            data.id,
            data.email,
            data.displayName ?? null,
            data.photoURL ?? null,
            data.stripeCustomerId,
            data.subscription,
            data.role,
            data.analytics,
            data.metadata,
            data.createdAt ?? new Date(),
            data.updatedAt ?? new Date()
        );
    }

    updateProfile(displayName: string, photoURL?: string): UserEntity {
        return new UserEntity(
            this.id,
            this.email,
            displayName,
            photoURL ?? this.photoURL,
            this.stripeCustomerId,
            this.subscription,
            this.role,
            this.analytics,
            this.metadata,
            this.createdAt,
            new Date()
        );
    }

    /**
     * Update user analytics data
     */
    updateAnalytics(analytics: Partial<UserAnalytics>): UserEntity {
        return new UserEntity(
            this.id,
            this.email,
            this.displayName,
            this.photoURL,
            this.stripeCustomerId,
            this.subscription,
            this.role,
            { ...this.analytics, ...analytics } as UserAnalytics,
            this.metadata,
            this.createdAt,
            new Date()
        );
    }

    /**
     * Check if user is super admin
     */
    isSuperAdmin(): boolean {
        return this.role === 'super_admin';
    }

    /**
     * Initialize default analytics for new users
     */
    static initializeAnalytics(): UserAnalytics {
        const now = new Date();
        return {
            lastLoginAt: now,
            lastActivityAt: now,
            loginCount: 0,
            sessionCount: 0,
            totalSessionDuration: 0,
            sermonsCreated: 0,
            sermonsPublished: 0,
            sermonsGenerated: 0,
            greekTutorSessions: 0,
            greekTutorCompleted: 0,
            libraryUploads: 0,
            seriesCreated: 0,
            preachingPlansCreated: 0,
            contentCreatedToday: 0,
            contentCreatedThisWeek: 0,
            engagementScore: 0,
            riskLevel: 'low',
        };
    }
}

