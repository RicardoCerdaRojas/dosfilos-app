import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onRequest, onCall } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { appCheckCallableOptions } from '../config/appCheckOptions';

const PLAN_PRICES: Record<string, number> = {
    pro: 9.99,
    team: 24.99,
    basic: 4.99,
};

const PLAN_NORMALIZED: Record<string, 'free' | 'pro' | 'team'> = {
    free: 'free',
    pro: 'pro',
    basic: 'pro',   // "basic" maps to "pro" tier for display purposes
    team: 'team',
};

function getTodayString(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Core analytics recalculation logic.
 * Reads from real Firestore collections and rebuilds global_metrics/aggregate
 * and global_metrics_daily/{today} from scratch.
 *
 * NOTE: totalUsers is always derived from the real users collection count,
 * never from an incremental counter, so it stays in sync with Firestore.
 */
async function runRecalculation(): Promise<void> {
    const db = getFirestore();
    const today = getTodayString();
    const now = new Date();

    // Define time windows
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    console.log('[recalculateAnalytics] Starting recalculation for', today);

    // ── 1. Users — source of truth: real document count ──────────────────────
    const usersSnap = await db.collection('users').get();
    let totalUsers = 0;
    let newUsersToday = 0;
    let mrr = 0;
    let paidUsers = 0;
    const planDist: Record<'free' | 'pro' | 'team', number> = { free: 0, pro: 0, team: 0 };

    usersSnap.forEach(doc => {
        const user = doc.data();
        totalUsers++;

        // New users today
        const createdAt = user.createdAt?.toDate?.() ?? null;
        if (createdAt && createdAt >= todayStart) {
            newUsersToday++;
        }

        // Plan distribution & MRR
        const rawPlanId: string = user.subscription?.planId || 'free';
        const normalizedPlan = PLAN_NORMALIZED[rawPlanId] ?? 'free';
        planDist[normalizedPlan]++;

        const status = user.subscription?.status;
        if (rawPlanId !== 'free' && (status === 'active' || status === 'trialing')) {
            mrr += PLAN_PRICES[rawPlanId] ?? 0;
            paidUsers++;
        }
    });

    // ── 2. DAU (Daily Active Users — unique users with any activity today) ──
    const dauSnap = await db.collection('user_activities')
        .where('timestamp', '>=', todayStart)
        .get();
    const dauSet = new Set<string>();
    dauSnap.forEach(doc => dauSet.add(doc.data().userId));
    const dau = dauSet.size;

    // ── 3. MAU (Monthly Active Users — unique users with activity in 30 days) ─
    const mauSnap = await db.collection('user_activities')
        .where('timestamp', '>=', thirtyDaysAgo)
        .get();
    const mauSet = new Set<string>();
    mauSnap.forEach(doc => mauSet.add(doc.data().userId));
    const mau = mauSet.size;

    // ── 4. Total logins today (unique users active today as proxy) ────────────
    const totalLoginsToday = dau;

    // ── 5. Sermons ────────────────────────────────────────────────────────────
    const sermonsSnap = await db.collection('sermons').get();
    let totalSermons = 0;
    let publishedSermons = 0;
    let draftSermons = 0;
    let sermonsCreatedToday = 0;

    sermonsSnap.forEach(doc => {
        const s = doc.data();
        totalSermons++;
        if (s.status === 'published') publishedSermons++;
        else draftSermons++;

        const createdAt = s.createdAt?.toDate?.() ?? null;
        if (createdAt && createdAt >= todayStart) {
            sermonsCreatedToday++;
        }
    });

    // ── 6. Greek (Faculty) tutor sessions ────────────────────────────────────
    let totalGreekSessions = 0;
    for (const colName of ['aiChatSessions', 'greekSessions', 'facultySessions', 'ai_chat_sessions']) {
        try {
            const snap = await db.collection(colName).get();
            if (!snap.empty) {
                totalGreekSessions = snap.size;
                console.log(`[recalculateAnalytics] Found tutor sessions in "${colName}": ${totalGreekSessions}`);
                break;
            }
        } catch (_e) {
            // collection doesn't exist, continue
        }
    }

    if (totalGreekSessions === 0) {
        const existingAgg = await db.doc('global_metrics/aggregate').get();
        if (existingAgg.exists) {
            totalGreekSessions = existingAgg.data()?.allTime?.greekSessions || 0;
        }
    }

    // ── 7. Preaching Series / Plans ───────────────────────────────────────────
    let totalSeries = 0;
    for (const colName of ['series', 'preachingPlans', 'preaching_plans']) {
        try {
            const snap = await db.collection(colName).get();
            if (!snap.empty) {
                totalSeries = snap.size;
                console.log(`[recalculateAnalytics] Found preaching plans in "${colName}": ${totalSeries}`);
                break;
            }
        } catch (_e) {
            // collection doesn't exist, continue
        }
    }

    if (totalSeries === 0) {
        const existingAgg = await db.doc('global_metrics/aggregate').get();
        if (existingAgg.exists) {
            totalSeries = existingAgg.data()?.allTime?.series || 0;
        }
    }

    // ── 8. Hito 7 funnel events — Faculty engagement + lead magnet rollup ────
    // Reads the funnel_events audit trail (written by trackFunnelEvent), groups
    // by eventName, and produces two windows: today and last 30 days. The
    // dashboard surfaces these so we can answer "are paid users actually using
    // Faculty?" and "is the lead magnet funnel converting?" without manually
    // pivoting GA4. Numbers stay independent of GA4's 14-month retention.
    const hito7Today = await rollupFunnelEvents(db, todayStart);
    const hito7Last30d = await rollupFunnelEvents(db, thirtyDaysAgo);

    // ── 9. Write results ──────────────────────────────────────────────────────
    const batch = db.batch();

    const aggregateRef = db.doc('global_metrics/aggregate');
    batch.set(aggregateRef, {
        allTime: {
            users: totalUsers,
            sermons: totalSermons,
            published: publishedSermons,
            drafts: draftSermons,
            greekSessions: totalGreekSessions,
            series: totalSeries,
            plans: 0, // Legacy field
        },
        currentMonth: {
            dau,
            mau,
            mrr: Math.round(mrr * 100) / 100,
            paidUsers,
        },
        hito7: {
            last30d: hito7Last30d,
        },
        lastUpdated: new Date(),
    }, { merge: false });

    const dailyRef = db.doc(`global_metrics_daily/${today}`);
    batch.set(dailyRef, {
        date: today,
        users: {
            new: newUsersToday,
            total: totalUsers,
            paidUsers,
            byPlan: {
                free: planDist.free,
                pro: planDist.pro,
                team: planDist.team,
            },
        },
        totalLogins: totalLoginsToday,
        sermons: {
            created: sermonsCreatedToday,
        },
        hito7: hito7Today,
        updatedAt: new Date(),
    }, { merge: false });

    await batch.commit();

    console.log('[recalculateAnalytics] ✅ Recalculation complete:', {
        totalUsers, dau, mau, mrr, paidUsers,
        planDist, totalSermons, totalGreekSessions, totalSeries,
        newUsersToday, sermonsCreatedToday, totalLoginsToday,
        hito7Today, hito7Last30d,
    });
}

/**
 * Counts `funnel_events` written since `since`, grouped by eventName.
 * Returns a flat `{ eventName: count }` map so the dashboard can render
 * any subset without the aggregator knowing about specific events.
 *
 * Uses `serverTimestamp` (the Firestore-stamped field, not the
 * client-supplied `clientTimestamp`) so clock skew on the user's
 * device doesn't move events between buckets.
 */
async function rollupFunnelEvents(
    db: FirebaseFirestore.Firestore,
    since: Date,
): Promise<Record<string, number>> {
    const snap = await db.collection('funnel_events')
        .where('serverTimestamp', '>=', since)
        .get();
    const counts: Record<string, number> = {};
    snap.forEach(doc => {
        const name = doc.data().eventName;
        if (typeof name !== 'string' || !name) return;
        counts[name] = (counts[name] ?? 0) + 1;
    });
    return counts;
}

/**
 * Scheduled version: runs every hour to keep metrics fresh.
 */
export const recalculateAnalytics = onSchedule({
    schedule: '0 * * * *', // Every hour
    timeZone: 'America/Santiago',
    memory: '512MiB',
    timeoutSeconds: 120,
}, async () => {
    await runRecalculation();
});

/**
 * Callable Function: invoked from the admin dashboard without CORS issues.
 * Requires the caller to be authenticated with Firebase Auth.
 */
export const recalculateAnalyticsCallable = onCall({
    ...appCheckCallableOptions(),
    memory: '512MiB',
    timeoutSeconds: 120,
}, async (request) => {
    if (!request.auth) {
        throw new Error('Unauthenticated');
    }
    await runRecalculation();
    return { success: true };
});

/**
 * HTTP trigger version: kept for backward compatibility.
 */
export const recalculateAnalyticsHttp = onRequest({
    memory: '512MiB',
    timeoutSeconds: 120,
    cors: true,
}, async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method Not Allowed' });
        return;
    }

    try {
        await runRecalculation();
        res.status(200).json({ success: true, message: 'Analytics recalculated successfully' });
    } catch (error) {
        console.error('[recalculateAnalyticsHttp] Error:', error);
        res.status(500).json({ error: 'Failed to recalculate analytics' });
    }
});
