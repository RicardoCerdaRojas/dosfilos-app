import {
    Subscription,
    IUserProfileRepository,
    IPlanRepository
} from '@dosfilos/domain';

export class SubscriptionService {
    constructor(
        private userProfileRepository: IUserProfileRepository,
        private planRepository: IPlanRepository
    ) { }

    /**
     * Update user subscription after Stripe events
     * Called by webhook handlers
     */
    async updateSubscription(userId: string, subscription: Subscription): Promise<void> {
        await this.userProfileRepository.updateSubscription(userId, subscription);
    }

    /**
     * Get user's current subscription
     */
    async getSubscription(userId: string): Promise<Subscription | null> {
        const profile = await this.userProfileRepository.getProfile(userId);
        return profile?.subscription ?? null;
    }

    /**
     * Check if user can upgrade to a plan
     */
    async canUpgradeTo(userId: string, targetPlanId: string): Promise<boolean> {
        const currentSubscription = await this.getSubscription(userId);
        const targetPlan = await this.planRepository.getById(targetPlanId);

        if (!targetPlan) return false;

        // No current plan - can subscribe to anything
        if (!currentSubscription) return true;

        // Compare plan tiers (assuming sortOrder indicates tier level)
        const currentPlan = await this.planRepository.getById(currentSubscription.planId);
        if (!currentPlan) return true;

        return targetPlan.sortOrder > currentPlan.sortOrder;
    }

    /**
     * Get available plans for user
     */
    async getAvailablePlans(userId: string): Promise<any[]> {
        const allPlans = await this.planRepository.getAll();
        const currentSubscription = await this.getSubscription(userId);

        return allPlans
            .filter(plan => plan.isPublic && plan.isActive)
            .map(plan => ({
                ...plan,
                isCurrent: currentSubscription?.planId === plan.id,
                canUpgrade: !currentSubscription ||
                    (currentSubscription.planId !== plan.id),
            }))
            .sort((a, b) => a.sortOrder - b.sortOrder);
    }
}
