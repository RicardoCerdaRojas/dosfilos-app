import { User } from '../entities/User';
import { Subscription } from '../entities/Subscription';
import type { SupportedLanguage } from '../types/i18n';

export interface IUserProfileRepository {
    getProfile(userId: string): Promise<User | null>;
    updateSubscription(userId: string, subscription: Subscription): Promise<void>;
    updateStripeCustomerId(userId: string, customerId: string): Promise<void>;
    /**
     * Persist the user's UI + AI output language preference. Called when the
     * user picks a language in `LanguageSwitcher` and at registration time
     * with the value derived from the request `Accept-Language` header.
     */
    updatePreferredLanguage(userId: string, language: SupportedLanguage): Promise<void>;
}
