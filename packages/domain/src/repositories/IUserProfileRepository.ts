import { User } from '../entities/User';
import { Subscription } from '../entities/Subscription';
import type { SupportedLanguage } from '../types/i18n';
import type { ConfessionVisibility, DeclaredConfessionId } from '../entities/User';

export interface UpdateDeclaredConfessionInput {
    declaredConfession: DeclaredConfessionId;
    confessionVisibility?: ConfessionVisibility;
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
     * Persist the pastor's declared confessional identity (ADR-007). Called
     * from the onboarding wizard's confession step + the dedicated
     * `/settings/confession` page. Stamps `confessionAffirmedAt` server-side.
     */
    updateDeclaredConfession(userId: string, input: UpdateDeclaredConfessionInput): Promise<void>;
}
