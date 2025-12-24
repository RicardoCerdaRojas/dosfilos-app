import {
    IUserProfileRepository,
    IPlanRepository,
} from '@dosfilos/domain';
import { db } from '@dosfilos/infrastructure';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';

export interface LimitCheckResult {
    allowed: boolean;
    reason?: string;
    remaining?: number;
    limit?: number;
}

export class UsageLimitsService {
    constructor(
        private userProfileRepo: IUserProfileRepository,
        private planRepo: IPlanRepository
    ) { }

    /**
     * Check if user can create a new sermon
     */
    async canCreateSermon(userId: string): Promise<LimitCheckResult> {
        const user = await this.userProfileRepo.getProfile(userId);
        if (!user) return { allowed: false, reason: 'Usuario no encontrado' };

        const plan = await this.planRepo.getById(user.subscription?.planId || 'free');
        if (!plan) return { allowed: false, reason: 'Plan no encontrado' };

        const limit = plan.limits.sermonsPerMonth;

        // Count sermons created this month
        const sermonsThisMonth = await this.countSermonsThisMonth(userId);

        if (sermonsThisMonth >= limit) {
            return {
                allowed: false,
                reason: this.getLimitMessage(plan.id, 'sermon', limit),
                remaining: 0,
                limit
            };
        }

        return {
            allowed: true,
            remaining: limit - sermonsThisMonth,
            limit
        };
    }

    /**
     * Check if user can create a new preaching plan
     * NOTE: Free plan has TOTAL limit, Pro/Team have MONTHLY limit
     */
    async canCreatePreachingPlan(userId: string): Promise<LimitCheckResult> {
        const user = await this.userProfileRepo.getProfile(userId);
        if (!user) return { allowed: false, reason: 'Usuario no encontrado' };

        const plan = await this.planRepo.getById(user.subscription?.planId || 'free');
        if (!plan) return { allowed: false, reason: 'Plan no encontrado' };

        if (plan.id === 'free') {
            // Free: Total absolute limit (1 total)
            const totalPlans = await this.countAllPreachingPlans(userId);
            const limit = plan.limits.maxPreachingPlans || 1;

            if (totalPlans >= limit) {
                return {
                    allowed: false,
                    reason: `Plan Free: Máximo ${limit} plan de predicación. Haz upgrade para crear más.`,
                    remaining: 0,
                    limit
                };
            }

            return { allowed: true, remaining: limit - totalPlans, limit };
        } else {
            // Pro/Team: Monthly limit
            const plansThisMonth = await this.countPreachingPlansThisMonth(userId);
            const limit = plan.limits.maxPreachingPlansPerMonth || 0;

            if (plansThisMonth >= limit) {
                return {
                    allowed: false,
                    reason: `Has creado ${limit} planes este mes. Espera al próximo mes o haz upgrade.`,
                    remaining: 0,
                    limit
                };
            }

            return { allowed: true, remaining: limit - plansThisMonth, limit };
        }
    }

    /**
     * Check if user can start a new Greek Tutor session
     */
    async canStartGreekSession(userId: string): Promise<LimitCheckResult> {
        const user = await this.userProfileRepo.getProfile(userId);
        if (!user) return { allowed: false, reason: 'Usuario no encontrado' };

        const plan = await this.planRepo.getById(user.subscription?.planId || 'free');
        if (!plan) return { allowed: false, reason: 'Plan no encontrado' };

        const limit = plan.limits.greekSessionsPerMonth;
        const sessionsThisMonth = await this.countGreekSessionsThisMonth(userId);

        if (sessionsThisMonth >= limit) {
            return {
                allowed: false,
                reason: this.getLimitMessage(plan.id, 'greek', limit),
                remaining: 0,
                limit
            };
        }

        return {
            allowed: true,
            remaining: limit - sessionsThisMonth,
            limit
        };
    }

    /**
     * Check if user can access library
     */
    async canAccessLibrary(userId: string): Promise<boolean> {
        const user = await this.userProfileRepo.getProfile(userId);
        if (!user) return false;

        const planId = user.subscription?.planId || 'free';
        return planId !== 'free';
    }

    /**
     * Get user's current library storage usage
     */
    async getLibraryStorageUsage(userId: string): Promise<{
        used: number;
        limit: number;
        percentage: number;
    }> {
        const user = await this.userProfileRepo.getProfile(userId);
        if (!user) return { used: 0, limit: 0, percentage: 0 };

        const plan = await this.planRepo.getById(user.subscription?.planId || 'free');
        if (!plan) return { used: 0, limit: 0, percentage: 0 };

        const used = await this.calculateLibraryStorageMB(userId);
        const limit = plan.limits.libraryStorageMB;

        return {
            used,
            limit,
            percentage: limit > 0 ? (used / limit) * 100 : 0
        };
    }

    private getLimitMessage(planId: string, type: 'sermon' | 'greek', limit: number): string {
        const messages = {
            free: {
                sermon: `Plan Free: ${limit} sermón por mes. Haz upgrade a Pro para 4 sermones/mes.`,
                greek: `Plan Free: ${limit} estudio por mes. Haz upgrade a Pro para 3 estudios/mes.`
            },
            pro: {
                sermon: `Plan Pro: ${limit} sermones por mes. Haz upgrade a Team para 12 sermones/mes.`,
                greek: `Plan Pro: ${limit} estudios por mes. Haz upgrade a Team para 15 estudios/mes.`
            },
            team: {
                sermon: `Has alcanzado tu límite mensual de ${limit} sermones.`,
                greek: `Has alcanzado tu límite mensual de ${limit} estudios.`
            }
        };

        return messages[planId as keyof typeof messages]?.[type] || `Límite alcanzado: ${limit} por mes`;
    }

    private async countSermonsThisMonth(userId: string): Promise<number> {
        const startOfMonth = this.getStartOfMonth();

        const sermonsRef = collection(db, 'sermons');
        const q = query(
            sermonsRef,
            where('userId', '==', userId),
            where('createdAt', '>=', Timestamp.fromDate(startOfMonth))
        );

        const snapshot = await getDocs(q);
        return snapshot.size;
    }

    private async countAllPreachingPlans(userId: string): Promise<number> {
        const seriesRef = collection(db, 'series');
        const q = query(
            seriesRef,
            where('userId', '==', userId)
        );

        const snapshot = await getDocs(q);
        return snapshot.size;
    }

    private async countPreachingPlansThisMonth(userId: string): Promise<number> {
        const startOfMonth = this.getStartOfMonth();

        const seriesRef = collection(db, 'series');
        const q = query(
            seriesRef,
            where('userId', '==', userId),
            where('createdAt', '>=', Timestamp.fromDate(startOfMonth))
        );

        const snapshot = await getDocs(q);
        return snapshot.size;
    }

    private async countGreekSessionsThisMonth(userId: string): Promise<number> {
        const startOfMonth = this.getStartOfMonth();

        const sessionsRef = collection(db, 'greek_sessions');
        const q = query(
            sessionsRef,
            where('userId', '==', userId),
            where('createdAt', '>=', Timestamp.fromDate(startOfMonth))
        );

        const snapshot = await getDocs(q);
        return snapshot.size;
    }

    private async calculateLibraryStorageMB(userId: string): Promise<number> {
        // Calculate total file size in user's library
        const resourcesRef = collection(db, 'library_resources');
        const q = query(
            resourcesRef,
            where('userId', '==', userId)
        );

        const snapshot = await getDocs(q);

        let totalBytes = 0;
        snapshot.forEach(doc => {
            totalBytes += doc.data().fileSizeBytes || 0;
        });

        return totalBytes / (1024 * 1024); // Convert to MB
    }

    private getStartOfMonth(): Date {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        return startOfMonth;
    }
}
