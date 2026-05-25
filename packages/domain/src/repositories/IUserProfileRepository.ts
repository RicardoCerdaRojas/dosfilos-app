import { User } from '../entities/User';
import { Subscription } from '../entities/Subscription';
import type { SupportedLanguage } from '../types/i18n';
import type { ConfessionVisibility, DeclaredConfessionId } from '../entities/User';

/**
 * @deprecated Use `UpdateConfessionalWitnessesInput` per ADR-010.
 * Single-anchor model retired in favour of multi-witness default-on.
 */
export interface UpdateDeclaredConfessionInput {
    declaredConfession: DeclaredConfessionId;
    confessionVisibility?: ConfessionVisibility;
}

/**
 * Toggles whether all confessional traditions in the catalog act as
 * Testigo 3 historical witnesses (ADR-010). When flipping to `false`,
 * the pastor must provide a written justification (≥50 chars) recorded
 * in `confessionChangeAudit/` — opting out of part of the method is a
 * decision the audit trail should capture.
 */
export interface UpdateConfessionalWitnessesInput {
    useConfessionalWitnesses: boolean;
    /**
     * Mandatory when flipping to `false`. Surfaced as a textarea in
     * `/settings/confession`. Justification appears in the audit row so
     * a future reviewer can see why the pastor opted out.
     */
    justification?: string;
}

export interface IUserProfileRepository {
    getProfile(userId: string): Promise<User | null>;
    /**
     * Real-time subscription to the profile doc. Returns the unsubscribe
     * function. Used by hooks that need to reflect plan changes (admin-driven
     * or Stripe-webhook-driven) without requiring a manual refresh.
     */
    subscribeProfile(
        userId: string,
        onChange: (profile: User | null) => void,
        onError?: (err: Error) => void,
    ): () => void;
    updateSubscription(userId: string, subscription: Subscription): Promise<void>;
    updateStripeCustomerId(userId: string, customerId: string): Promise<void>;
    /**
     * Persist the user's UI + AI output language preference. Called when the
     * user picks a language in `LanguageSwitcher` and at registration time
     * with the value derived from the request `Accept-Language` header.
     */
    updatePreferredLanguage(userId: string, language: SupportedLanguage): Promise<void>;
    /**
     * @deprecated Per ADR-010 the single-anchor model is retired. Keep the
     * method so legacy callers continue to compile, but new code should
     * use `updateConfessionalWitnesses` instead.
     */
    updateDeclaredConfession(userId: string, input: UpdateDeclaredConfessionInput): Promise<void>;
    /**
     * Toggle multi-witness mode (ADR-010). Writes
     * `useConfessionalWitnesses` to the user doc and appends an audit
     * row capturing the previous + new values + the pastor's
     * justification when opting out.
     */
    updateConfessionalWitnesses(userId: string, input: UpdateConfessionalWitnessesInput): Promise<void>;
}
