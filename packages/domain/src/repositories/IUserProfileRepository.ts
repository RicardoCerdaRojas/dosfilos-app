import { User } from '../entities/User';
import { Subscription } from '../entities/Subscription';

export interface IUserProfileRepository {
    getProfile(userId: string): Promise<User | null>;
    updateSubscription(userId: string, subscription: Subscription): Promise<void>;
    updateStripeCustomerId(userId: string, customerId: string): Promise<void>;
}
