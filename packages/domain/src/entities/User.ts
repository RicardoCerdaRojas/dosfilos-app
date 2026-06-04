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
    /**
     * Phase 1.5 sub-flag — gates the new `PastoralWordStudyModal` that
     * replaces the `GreekTutorOverlay` embed inside `MorphologyStep`.
     * Requires `pastoral_fidelity_flow` to also be on; otherwise the
     * step component shows nothing at all. When this flag is off and the
     * parent is on, MorphologyStep keeps the Phase 1 interim degraded
     * surface (greek tutor embed) per ADR-016.
     */
    'pastoral_word_study',
    /**
     * Phase 2 sub-flag — gates the three-witnesses validation gate
     * (`WitnessGate`) that runs after the six-step seed completes and
     * before the draft (ADR-011). Requires `pastoral_fidelity_flow` to
     * also be on. When this flag is off and the parent is on, the seed
     * wizard's "Continuar al borrador" behaves as in Phase 1 (no
     * witness validation). Default off → blast radius 0 until toggled.
     */
    'three_witnesses',
    /**
     * Phase 2.5 sub-flag — gates the Study Companion: the coverage badge in
     * the wizard + per-step orientation ("Pedir orientación", ADR-026) +
     * (PR B/C) Faculty evidence and the pre-generation gate. Requires
     * `pastoral_fidelity_flow` to also be on. Default off → blast radius 0
     * until toggled.
     */
    'study_depth',
    /**
     * Phase 3 sub-flag — gates the claim/source fidelity pass: the second
     * LLM evaluator that scores every `[N]` marker in a generated sermon
     * (supports/partial/unrelated/contradicts), the FidelityReviewPanel in
     * the sermon editor, and (later PRs) the pre-publish gate + plurality
     * + authority + attribution-footer validators (ADR-029). Requires
     * `pastoral_fidelity_flow` to also be on. Default off → blast radius 0
     * until toggled.
     *
     * 🛑 DORMANT (ADR-032). Per ADR-030/031 the per-marker claim↔source pass is
     * a PAPER feature, not a sermon feature; on the published sermon it also
     * hits a content-shape mismatch (string content + top-level manifest). Keep
     * this OFF — do NOT flip on for the sermon without revisiting ADR-032. The
     * machinery relocates to the paper in Phase 7.
     */
    'fidelity_pass',
] as const;

export type FeatureFlagName = (typeof FEATURE_FLAG_NAMES)[number];

export type FeatureFlags = Partial<Record<FeatureFlagName, boolean>>;

/**
 * @deprecated Per [ADR-010](docs/pastoral-fidelity/decisions/ADR-010-confessional-witnesses-default-on.md)
 * the single-anchor model is replaced by multi-witness default-on. The
 * field stays on `User` for historical data preservation but is NOT
 * consumed by Phase 2 Testigo 3 anymore. New code should use
 * `useConfessionalWitnesses` instead.
 */
export type DeclaredConfessionId = string;

/**
 * @deprecated Same lifecycle as `DeclaredConfessionId` — kept for data
 * preservation, no longer consumed. New "non-confessional" flow uses
 * `useConfessionalWitnesses: false`.
 */
export const NON_CONFESSIONAL: DeclaredConfessionId = 'non-confessional';

/**
 * Visibility of a pastor's declared confession. Default `'private'`.
 * Kept for backwards compat with users who declared under ADR-007/009.
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
     * @deprecated Per ADR-010, single-anchor model retired. Field
     * preserved for historical data only. Multi-witness mode is now
     * controlled by `useConfessionalWitnesses`.
     */
    declaredConfession?: DeclaredConfessionId;
    confessionAffirmedAt?: Date;
    confessionVisibility?: ConfessionVisibility;

    /**
     * Pastoral Fidelity (ADR-010) — whether the three-witness mechanism
     * uses **all** confessional traditions in the catalog as historical
     * witnesses (Testigo 3).
     *
     * Default `true` because historical theology is constitutive of the
     * method per the manifesto, not opt-in. Pastor can flip OFF in
     * `/settings/confession` with a written justification recorded in
     * `confessionChangeAudit/`. When OFF, only `core` ecumenical
     * doctrines still fire (universal, non-negotiable); `distinctive`
     * and `open-evangelical` checks are silenced.
     */
    useConfessionalWitnesses?: boolean;

    /**
     * Phase 2.5 PR C (ADR-027) — Pastor's preference for the Study Companion
     * "expert mode" at the pre-generation gate. Self-service-once-earned:
     * the toggle visible to the pastor only unlocks after they accumulate
     * `EXPERT_MODE_UNLOCK_THRESHOLD` sermons with `studyDepthSnapshot.
     * overallScore >= EXPERT_MODE_GOOD_SCORE` AND
     * `bypassedConfrontation === false`. Expert mode SOFTENS (collapses
     * the gate modal to a quiet card) but NEVER silences confrontation
     * on red dims — P3 stays intact. Super-admins may force-set this
     * field regardless of the threshold (audit-logged).
     */
    expertModeOn?: boolean;
    /** Set when the pastor (or admin) flips `expertModeOn` to true. */
    expertModeUnlockedAt?: Date;

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

