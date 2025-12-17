import {
    User,
    PlanDefinition,
    Subscription,
    SubscriptionStatus,
    Module,
    Feature,
    AdminPermission,
    IPlanRepository
} from '@dosfilos/domain';

const ADMIN_EMAIL = 'rdocerda@gmail.com'; // TODO: Move to config

export class AuthorizationService {
    constructor(private planRepository: IPlanRepository) { }

    /**
     * Check if user has access to a specific module
     */
    hasModule(user: User | null, module: Module): boolean {
        if (!user) return false;

        // Admin has all modules
        if (this.isAdmin(user)) return true;

        const plan = this.getActivePlan(user);
        if (!plan) {
            // Free plan - default modules
            return this.isFreeModule(module);
        }

        return plan.modules.includes(module);
    }

    /**
     * Check if user has a specific feature capability
     */
    hasFeature(user: User | null, feature: Feature): boolean {
        if (!user) return false;

        // Admin has all features
        if (this.isAdmin(user)) return true;

        const plan = this.getActivePlan(user);
        if (!plan) {
            // Free plan - basic features only
            return this.isFreeFeature(feature);
        }

        return plan.features.includes(feature);
    }

    /**
     * Check if user has admin permission
     */
    hasAdminPermission(user: User | null, permission: AdminPermission): boolean {
        if (!user) return false;
        return this.isAdmin(user);
    }

    /**
     * Check if user is admin
     */
    isAdmin(user: User | null): boolean {
        if (!user) return false;
        return user.email === ADMIN_EMAIL;
    }

    /**
     * Check if subscription is active
     */
    isPlanActive(subscription?: Subscription): boolean {
        if (!subscription) return false;

        // Active status
        if (subscription.status === SubscriptionStatus.ACTIVE) return true;

        // Trialing status
        if (subscription.status === SubscriptionStatus.TRIALING) return true;

        // Cancelled but still within grace period
        if (
            subscription.status === SubscriptionStatus.CANCELLED &&
            subscription.cancelAtPeriodEnd &&
            new Date() < subscription.currentPeriodEnd
        ) {
            return true;
        }

        return false;
    }

    /**
     * Get the active plan for a user
     */
    async getActivePlan(user: User | null): Promise<PlanDefinition | null> {
        if (!user || !user.subscription) return null;

        if (!this.isPlanActive(user.subscription)) return null;

        const plan = await this.planRepository.getById(user.subscription.planId);
        return plan;
    }

    /**
     * Get plan name for display
     */
    getPlanName(user: User | null): string {
        if (!user) return 'Free';
        if (this.isAdmin(user)) return 'Admin';
        if (!user.subscription || !this.isPlanActive(user.subscription)) {
            return 'Free';
        }

        // Capitalize first letter
        return user.subscription.planId.charAt(0).toUpperCase() +
            user.subscription.planId.slice(1);
    }

    /**
     * Check if module is available in free plan
     */
    private isFreeModule(module: Module): boolean {
        const freeModules = [
            Module.DASHBOARD,
            Module.SERMONES,
            Module.CONFIGURACION,
        ];
        return freeModules.includes(module);
    }

    /**
     * Check if feature is available in free plan
     */
    private isFreeFeature(feature: Feature): boolean {
        const freeFeatures = [
            Feature.SERMON_CREATE,
        ];
        return freeFeatures.includes(feature);
    }
}
