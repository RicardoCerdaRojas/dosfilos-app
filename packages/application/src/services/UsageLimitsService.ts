import {
    IUserProfileRepository,
    IPlanRepository,
    currentPeriodKey,
} from '@dosfilos/domain';
import { db } from '@dosfilos/infrastructure';
import { collection, query, where, getDocs, Timestamp, doc, getDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

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

        const plan = await this.planRepo.getById(user.subscription?.planId || 'basic');
        if (!plan) return { allowed: false, reason: 'Plan no encontrado' };

        const limit = plan.limits.sermonsPerMonth;
        if (limit === -1) return { allowed: true };

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

        const plan = await this.planRepo.getById(user.subscription?.planId || 'basic');
        if (!plan) return { allowed: false, reason: 'Plan no encontrado' };

        const limit = plan.limits.maxPreachingPlansPerMonth ?? 0;
        if (limit === -1) return { allowed: true };

        const plansThisMonth = await this.countPreachingPlansThisMonth(userId);

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

    /**
     * Check if user can start a new Greek Tutor session.
     * Limit semantics: -1 = unlimited (Pro/Equipo), 0 = blocked, n>0 = monthly cap.
     */
    async canStartGreekSession(userId: string): Promise<LimitCheckResult> {
        const user = await this.userProfileRepo.getProfile(userId);
        if (!user) return { allowed: false, reason: 'Usuario no encontrado' };

        const plan = await this.planRepo.getById(user.subscription?.planId || 'basic');
        if (!plan) return { allowed: false, reason: 'Plan no encontrado' };

        const limit = plan.limits.greekSessionsPerMonth;
        if (limit === -1) return { allowed: true };

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
     * Check if user can start a new Hebrew Tutor session. Mirrors Greek —
     * Free / Personal get a small monthly cap as a conversion hook into Pro.
     */
    async canStartHebrewSession(userId: string): Promise<LimitCheckResult> {
        const user = await this.userProfileRepo.getProfile(userId);
        if (!user) return { allowed: false, reason: 'Usuario no encontrado' };

        const plan = await this.planRepo.getById(user.subscription?.planId || 'basic');
        if (!plan) return { allowed: false, reason: 'Plan no encontrado' };

        // `hebrewSessionsPerMonth` is optional — legacy plans without it fall
        // through to "allowed" so we don't break existing accounts.
        const limit = plan.limits.hebrewSessionsPerMonth;
        if (limit === undefined || limit === -1) return { allowed: true };

        const sessionsThisMonth = await this.countHebrewSessionsThisMonth(userId);

        if (sessionsThisMonth >= limit) {
            return {
                allowed: false,
                reason: this.getLimitMessage(plan.id, 'hebrew', limit),
                remaining: 0,
                limit,
            };
        }

        return {
            allowed: true,
            remaining: limit - sessionsThisMonth,
            limit,
        };
    }

    /**
     * Check if user can access library
     */
    async canAccessLibrary(userId: string): Promise<boolean> {
        const user = await this.userProfileRepo.getProfile(userId);
        if (!user) return false;

        // All plans now have library access (Basic, Pro, Team)
        return true;
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

        const plan = await this.planRepo.getById(user.subscription?.planId || 'basic');
        if (!plan) return { used: 0, limit: 0, percentage: 0 };

        const used = await this.calculateLibraryStorageMB(userId);
        const limit = plan.limits.libraryStorageMB;

        return {
            used,
            limit,
            percentage: limit > 0 ? (used / limit) * 100 : 0
        };
    }

    // ── Personal Library quotas (Phase 2 RAG model) ─────────────────────────
    // These gate the new business model. All three return LimitCheckResult so the
    // UI can display remaining quota + upgrade prompts.

    /**
     * Check if user can upload another document (vs plan.libraryDocsLimit).
     * Undefined limit = no quota enforced (legacy plans).
     */
    async canUploadDocument(userId: string): Promise<LimitCheckResult> {
        const user = await this.userProfileRepo.getProfile(userId);
        if (!user) return { allowed: false, reason: 'Usuario no encontrado' };
        const plan = await this.planRepo.getById(user.subscription?.planId || 'basic');
        if (!plan) return { allowed: false, reason: 'Plan no encontrado' };

        const limit = plan.limits.libraryDocsLimit;
        if (limit === undefined || limit < 0) {
            return { allowed: true };  // No quota on this plan
        }

        const current = await this.countUserDocuments(userId);
        if (current >= limit) {
            return {
                allowed: false,
                limit,
                remaining: 0,
                reason: `Has alcanzado el límite de ${limit} documentos de tu plan. Haz upgrade para subir más.`,
            };
        }
        return { allowed: true, limit, remaining: limit - current };
    }

    /**
     * Check if user can process N more pages this month (vs plan.pagesProcessedPerMonth).
     * Call this BEFORE kicking off LlamaParse extraction to avoid paying for pages
     * the user won't be billed/allowed for.
     */
    async canProcessPages(userId: string, pagesToAdd: number): Promise<LimitCheckResult> {
        const user = await this.userProfileRepo.getProfile(userId);
        if (!user) return { allowed: false, reason: 'Usuario no encontrado' };
        const plan = await this.planRepo.getById(user.subscription?.planId || 'basic');
        if (!plan) return { allowed: false, reason: 'Plan no encontrado' };

        const limit = plan.limits.pagesProcessedPerMonth;
        if (limit === undefined || limit < 0) {
            return { allowed: true };
        }

        const counter = await this.getUsageCounter(userId);
        const projected = counter.pagesProcessed + pagesToAdd;
        if (projected > limit) {
            return {
                allowed: false,
                limit,
                remaining: Math.max(0, limit - counter.pagesProcessed),
                reason: `Este documento tiene ${pagesToAdd} páginas y excedería tu límite mensual de ${limit} páginas procesadas (llevas ${counter.pagesProcessed}). Haz upgrade o espera al próximo ciclo.`,
            };
        }
        return { allowed: true, limit, remaining: limit - projected };
    }

    /**
     * Check if user can send another chat query this month (vs plan.queriesPerMonth).
     * `-1` on the plan means unlimited.
     */
    async canQuery(userId: string): Promise<LimitCheckResult> {
        const user = await this.userProfileRepo.getProfile(userId);
        if (!user) return { allowed: false, reason: 'Usuario no encontrado' };
        const plan = await this.planRepo.getById(user.subscription?.planId || 'basic');
        if (!plan) return { allowed: false, reason: 'Plan no encontrado' };

        const limit = plan.limits.queriesPerMonth;
        if (limit === undefined || limit < 0) {
            return { allowed: true };  // Unlimited
        }

        const counter = await this.getUsageCounter(userId);
        if (counter.queriesUsed >= limit) {
            return {
                allowed: false,
                limit,
                remaining: 0,
                reason: `Has alcanzado tu límite de ${limit} consultas este mes. Haz upgrade para más.`,
            };
        }
        return { allowed: true, limit, remaining: limit - counter.queriesUsed };
    }

    /**
     * Whether the user's current plan permits creating Faculty projects.
     *
     * Hito 5.2 rule: Free tier doesn't get projects (it's a read-only window
     * into the curated Core Library). Any plan with `libraryDocsLimit > 0`
     * — i.e. has a personal library — also gets projects, so Personal / Pro /
     * Equipo all qualify. Plans with `libraryDocsLimit` undefined (legacy
     * accounts created before Hito 4) fall through to "allowed".
     */
    async canCreateProject(userId: string): Promise<LimitCheckResult> {
        const user = await this.userProfileRepo.getProfile(userId);
        if (!user) return { allowed: false, reason: 'Usuario no encontrado' };
        const plan = await this.planRepo.getById(user.subscription?.planId || 'basic');
        if (!plan) return { allowed: false, reason: 'Plan no encontrado' };

        const docsLimit = plan.limits.libraryDocsLimit;
        if (docsLimit !== undefined && docsLimit <= 0) {
            return {
                allowed: false,
                reason: 'Tu plan actual no incluye proyectos. Haz upgrade para crear espacios dedicados de trabajo.',
            };
        }
        return { allowed: true };
    }

    /**
     * Returns the full usage snapshot for the current month — used by the
     * `/dashboard/subscription` UsageDashboard so the user can see every quota
     * in their plan at a glance, not just the few that involve a counter doc.
     *
     * Limit semantics:
     *   - `undefined` → quota field not present on this plan (legacy or new tier)
     *   - `0` → feature explicitly NOT included in this tier (e.g. Free has no
     *     personal library, so libraryDocsLimit=0). The UI should hide these
     *     rows rather than show "0/0".
     *   - `-1` → unlimited (Pro/Equipo).
     *   - `n>0` → enforce monthly cap.
     */
    async getMonthlyUsage(userId: string): Promise<{
        docs: { current: number; limit?: number };
        pagesProcessed: { current: number; limit?: number };
        queries: { current: number; limit?: number };
        sermons: { current: number; limit?: number };
        series: { current: number; limit?: number };
        greekSessions: { current: number; limit?: number };
        hebrewSessions: { current: number; limit?: number };
        periodKey: string;
    }> {
        const user = await this.userProfileRepo.getProfile(userId);
        const plan = user ? await this.planRepo.getById(user.subscription?.planId || 'free') : null;
        const counter = await this.getUsageCounter(userId);

        // Parallelize the count queries — these are 5 independent Firestore
        // reads, no need to serialize them.
        const [docs, sermonsCount, seriesCount, greekCount, hebrewCount] = await Promise.all([
            this.countUserDocuments(userId),
            this.countSermonsThisMonth(userId),
            this.countPreachingPlansThisMonth(userId),
            this.countGreekSessionsThisMonth(userId),
            this.countHebrewSessionsThisMonth(userId),
        ]);

        return {
            docs: { current: docs, limit: plan?.limits.libraryDocsLimit },
            pagesProcessed: { current: counter.pagesProcessed, limit: plan?.limits.pagesProcessedPerMonth },
            queries: { current: counter.queriesUsed, limit: plan?.limits.queriesPerMonth },
            sermons: { current: sermonsCount, limit: plan?.limits.sermonsPerMonth },
            series: { current: seriesCount, limit: plan?.limits.maxPreachingPlansPerMonth },
            greekSessions: { current: greekCount, limit: plan?.limits.greekSessionsPerMonth },
            hebrewSessions: { current: hebrewCount, limit: plan?.limits.hebrewSessionsPerMonth },
            periodKey: counter.periodKey,
        };
    }

    // ── Internal helpers for new quotas ──────────────────────────────────────

    private async countUserDocuments(userId: string): Promise<number> {
        const q = query(
            collection(db, 'library_resources'),
            where('userId', '==', userId)
        );
        const snap = await getDocs(q);
        return snap.size;
    }

    private async getUsageCounter(userId: string): Promise<{ pagesProcessed: number; queriesUsed: number; docsUploadedThisMonth: number; periodKey: string }> {
        const periodKey = currentPeriodKey();
        const ref = doc(db, 'users', userId, 'usage_counters', periodKey);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
            return { pagesProcessed: 0, queriesUsed: 0, docsUploadedThisMonth: 0, periodKey };
        }
        const d = snap.data();
        return {
            pagesProcessed: d.pagesProcessed ?? 0,
            queriesUsed: d.queriesUsed ?? 0,
            docsUploadedThisMonth: d.docsUploadedThisMonth ?? 0,
            periodKey,
        };
    }

    private getLimitMessage(planId: string, type: 'sermon' | 'greek' | 'hebrew', limit: number): string {
        const noun: Record<typeof type, string> = {
            sermon: 'sermones',
            greek: 'estudios de Griego',
            hebrew: 'estudios de Hebreo',
        };
        const upgradeHint: Record<string, string> = {
            free: 'Haz upgrade a Personal para más uso o a Pro para acceso ilimitado.',
            basic: 'Haz upgrade a Pro para acceso ilimitado.',
            pro: '',
            team: '',
        };
        const hint = upgradeHint[planId] ?? '';
        return `Has alcanzado tu límite mensual de ${limit} ${noun[type]}.${hint ? ' ' + hint : ''}`.trim();
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

        // `greek_sessions` is the canonical collection written by
        // FirestoreGreekSessionRepository; an earlier mistake pointed at
        // `greek_tutor_sessions` (a collection nobody writes to), so the
        // count was silently 0 — and the read failed once Firestore rules
        // were tightened because no rule existed for it.
        const sessionsRef = collection(db, 'greek_sessions');
        const q = query(
            sessionsRef,
            where('userId', '==', userId),
            where('createdAt', '>=', Timestamp.fromDate(startOfMonth))
        );

        const snapshot = await getDocs(q);
        return snapshot.size;
    }

    private async countHebrewSessionsThisMonth(userId: string): Promise<number> {
        const startOfMonth = this.getStartOfMonth();

        const sessionsRef = collection(db, 'hebrew_user_sessions');
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

    /**
     * Fires the `incrementUsage` callable to bump the user's monthly
     * query counter. Fail-soft: counter drift is preferred over
     * blocking the chat on a usage-tracking glitch, so the caller
     * should fire-and-forget (`void incrementQuery(...)`).
     *
     * Lives here (vs. inline in the hook) so the Firebase callable
     * SDK stays out of `useFacultyChat` — compliance C7.3.
     */
    async incrementQuery(): Promise<void> {
        try {
            const fn = httpsCallable(getFunctions(), 'incrementUsage');
            await fn({ kind: 'query' });
        } catch (err) {
            console.warn('[UsageLimitsService] Failed to increment query counter:', err);
        }
    }
}
