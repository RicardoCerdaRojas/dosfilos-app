import {
    doc,
    getDoc,
    getFirestore,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import type { PlanDefinition } from '@dosfilos/domain';

export interface AdminUserUsageSnapshot {
    usage: {
        pagesProcessed: number;
        queriesUsed: number;
        docsUploadedThisMonth: number;
        periodKey: string;
    };
    plan: PlanDefinition | null;
}

export interface AdminUserAnalytics {
    userId: string;
    sermons: { total: number; published: number; drafts: number };
    greekSessions: { total: number; completed: number };
    series: { total: number };
    preachingPlans: { total: number };
    logins: { total: number };
}

/**
 * Raw shape returned by `getDashboardSnapshot()`. The web hook
 * (`useAdminMetrics`) maps this into its UI-friendly
 * `DashboardMetrics` view-model — keeping the mapping there means
 * adding new tiles is a web-only edit, no service redeploy.
 *
 * `aggregate` is `global_metrics/aggregate` (recalculated hourly by
 * `recalculateAnalytics`). `daily` is `global_metrics_daily/{today}`
 * with today's per-day rollup. Both can be `null` on first boot.
 */
export interface AdminDashboardSnapshot {
    aggregate: {
        allTime?: {
            users?: number;
            sermons?: number;
            published?: number;
            drafts?: number;
            greekSessions?: number;
            series?: number;
        };
        currentMonth?: {
            dau?: number;
            mau?: number;
            mrr?: number;
            paidUsers?: number;
        };
        hito7?: { last30d?: Record<string, number> };
        lastUpdated?: Date | null;
    } | null;
    daily: {
        users?: {
            new?: number;
            byPlan?: { free?: number; pro?: number; team?: number };
        };
        sermons?: { created?: number };
        totalLogins?: number;
        hito7?: Record<string, number>;
    } | null;
}

/**
 * Service that fronts the admin Analytics Dashboard's data access.
 * Reads the pre-aggregated Firestore docs and surfaces the
 * recalculate callable, so the web hook can stay a thin presenter
 * (and the compliance gate's "no firebase imports in .tsx/hooks"
 * rule holds in `useAdminMetrics.ts`).
 */
export class AdminDashboardService {
    private readonly AGGREGATE_PATH = 'global_metrics/aggregate';
    private readonly DAILY_COLLECTION = 'global_metrics_daily';

    async getDashboardSnapshot(): Promise<AdminDashboardSnapshot> {
        const db = getFirestore();

        const aggregateSnap = await getDoc(doc(db, this.AGGREGATE_PATH));
        const aggregate = aggregateSnap.exists()
            ? this.normalizeAggregate(aggregateSnap.data())
            : null;

        const dailySnap = await getDoc(doc(db, this.DAILY_COLLECTION, this.todayKey()));
        const daily = dailySnap.exists()
            ? (dailySnap.data() as AdminDashboardSnapshot['daily'])
            : null;

        return { aggregate, daily };
    }

    /**
     * Fires the `recalculateAnalyticsCallable` Cloud Function. The
     * dashboard awaits this then refetches — there's no streaming
     * progress, just a "done" return value.
     */
    async triggerRecalculation(): Promise<void> {
        const recalc = httpsCallable(getFunctions(), 'recalculateAnalyticsCallable');
        await recalc({});
    }

    /**
     * Reads the current-period `usage_counters` doc for a user plus
     * the matching plan definition so the admin user-detail view can
     * render "X of Y" + percentage progress in one network round-trip.
     * Returns zeros for missing counter docs (new user before any
     * activity tracked).
     */
    async getUserUsageSnapshot(userId: string, planId?: string): Promise<AdminUserUsageSnapshot> {
        const db = getFirestore();
        const periodKey = this.currentPeriodKey();
        const usageRef = doc(db, 'users', userId, 'usage_counters', periodKey);
        const planRef = planId ? doc(db, 'plans', planId) : null;

        const [usageSnap, planSnap] = await Promise.all([
            getDoc(usageRef),
            planRef ? getDoc(planRef) : Promise.resolve(null),
        ]);

        const usage = usageSnap.exists()
            ? {
                pagesProcessed: usageSnap.data().pagesProcessed ?? 0,
                queriesUsed: usageSnap.data().queriesUsed ?? 0,
                docsUploadedThisMonth: usageSnap.data().docsUploadedThisMonth ?? 0,
                periodKey,
            }
            : { pagesProcessed: 0, queriesUsed: 0, docsUploadedThisMonth: 0, periodKey };

        const plan = planSnap?.exists() ? (planSnap.data() as PlanDefinition) : null;

        return { usage, plan };
    }

    /**
     * Reads the pre-aggregated `user_analytics/{userId}` doc with
     * lifetime counters across sermons, Greek sessions, series, plans
     * and logins. Returns zeroed totals when the user has no analytics
     * doc yet (created server-side after first activity).
     */
    async getUserAnalytics(userId: string): Promise<AdminUserAnalytics> {
        const db = getFirestore();
        const snap = await getDoc(doc(db, 'user_analytics', userId));
        if (!snap.exists()) {
            return {
                userId,
                sermons: { total: 0, published: 0, drafts: 0 },
                greekSessions: { total: 0, completed: 0 },
                series: { total: 0 },
                preachingPlans: { total: 0 },
                logins: { total: 0 },
            };
        }
        const data = snap.data();
        return {
            userId,
            sermons: data.sermons || { total: 0, published: 0, drafts: 0 },
            greekSessions: data.greekSessions || { total: 0, completed: 0 },
            series: data.series || { total: 0 },
            preachingPlans: data.preachingPlans || { total: 0 },
            logins: data.logins || { total: 0 },
        };
    }

    private currentPeriodKey(date: Date = new Date()): string {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }

    private todayKey(date: Date = new Date()): string {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    /**
     * Normalizes the raw Firestore aggregate doc into the typed
     * snapshot, converting the Firestore Timestamp on `lastUpdated`
     * into a JS Date so the hook doesn't need to know about the SDK.
     */
    private normalizeAggregate(raw: Record<string, unknown>): AdminDashboardSnapshot['aggregate'] {
        const lastUpdatedRaw = raw.lastUpdated as { toDate?: () => Date } | Date | null | undefined;
        const lastUpdated = lastUpdatedRaw && 'toDate' in lastUpdatedRaw && typeof lastUpdatedRaw.toDate === 'function'
            ? lastUpdatedRaw.toDate()
            : (lastUpdatedRaw instanceof Date ? lastUpdatedRaw : null);
        return {
            ...(raw as Omit<NonNullable<AdminDashboardSnapshot['aggregate']>, 'lastUpdated'>),
            lastUpdated,
        };
    }
}

export const adminDashboardService = new AdminDashboardService();
