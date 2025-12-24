import { UserEntity } from '@dosfilos/domain';

export interface UserDetailsDTO {
    // Basic Info
    id: string;
    email: string;
    displayName: string | null;
    photoURL: string | null;
    createdAt: Date;
    role: 'user' | 'super_admin';

    // Subscription Info
    subscription: {
        planId: 'free' | 'pro' | 'team';
        status: 'active' | 'cancelled' | 'past_due' | 'trialing';
        startDate?: Date;
        currentPeriodEnd?: Date;
        cancelAtPeriodEnd: boolean;
        stripePriceId?: string;
        stripeCustomerId?: string;
    };

    // Analytics
    analytics: {
        engagementScore: number;
        lastLoginAt?: Date;
        loginCount: number;
        totalRevenue: number;
        sermonsCreated: number;
        lastActivityAt?: Date;
    };

    // Metadata
    metadata?: {
        source?: string;
        device?: string;
        referrer?: string;
    };
}

export interface IUserRepository {
    getUserById(id: string): Promise<UserEntity | null>;
}

/**
 * Use Case: Get User Details
 * 
 * Fetches detailed information about a specific user.
 * Used by admin dashboard for user detail view.
 */
export class GetUserDetails {
    constructor(private userRepository: IUserRepository) { }

    async execute(userId: string): Promise<UserDetailsDTO | null> {
        const user = await this.userRepository.getUserById(userId);

        if (!user) {
            return null;
        }

        return this.mapToDTO(user);
    }

    private mapToDTO(user: UserEntity): UserDetailsDTO {
        const userData = user as any;

        return {
            // Basic Info
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            createdAt: userData.createdAt || new Date(),
            role: userData.role || 'user',

            // Subscription Info
            subscription: {
                planId: userData.subscription?.planId || 'free',
                status: userData.subscription?.status || 'active',
                startDate: userData.subscription?.startDate,
                currentPeriodEnd: userData.subscription?.currentPeriodEnd,
                cancelAtPeriodEnd: userData.subscription?.cancelAtPeriodEnd || false,
                stripePriceId: userData.subscription?.stripePriceId,
                stripeCustomerId: userData.stripeCustomerId,
            },

            // Analytics
            analytics: {
                engagementScore: userData.analytics?.engagementScore || 0,
                lastLoginAt: userData.analytics?.lastLoginAt,
                loginCount: userData.analytics?.loginCount || 0,
                totalRevenue: userData.analytics?.totalRevenue || 0,
                sermonsCreated: userData.analytics?.sermonsCreated || 0,
                lastActivityAt: userData.analytics?.lastActivityAt,
            },

            // Metadata
            metadata: userData.metadata,
        };
    }
}
