export enum SubscriptionStatus {
    ACTIVE = 'active',
    PAST_DUE = 'past_due',
    CANCELLED = 'cancelled',
    INCOMPLETE = 'incomplete',
    TRIALING = 'trialing',
}

export interface Subscription {
    // Core fields
    id: string; // Stripe subscription ID
    planId: string; // Internal plan ID ("free", "starter", "pro")
    status: SubscriptionStatus;
    stripePriceId: string; // Stripe Price ID

    // Billing cycle
    startDate: Date; // Subscription start
    currentPeriodStart: Date; // Current billing cycle start
    currentPeriodEnd: Date; // Current billing cycle end (next billing date)

    // Cancellation
    cancelledAt?: Date; // When user requested cancellation
    cancelAtPeriodEnd: boolean; // If scheduled to cancel at period end

    // Failed payments
    failedPaymentAttempts?: number; // Counter 0-3 before auto-cancel
    lastPaymentError?: {
        message: string;
        attemptedAt: Date;
    };

    // Optional features
    trialEnd?: Date; // Trial period end (if applicable)

    // Metadata
    updatedAt: Date;
}
