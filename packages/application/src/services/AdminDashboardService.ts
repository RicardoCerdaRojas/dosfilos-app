import {
    doc,
    getDoc,
    getFirestore,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

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
