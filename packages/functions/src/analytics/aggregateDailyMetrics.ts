import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

/**
 * Cloud Function: Aggregate Daily Metrics
 * 
 * Scheduled function that runs daily at 00:05 CLT (03:05 UTC) to aggregate
 * the previous day's metrics into the daily_metrics collection.
 * 
 * This pre-aggregation improves dashboard performance by avoiding
 * real-time calculations on large datasets.
 */
export const aggregateDailyMetrics = onSchedule({
    schedule: '5 3 * * *', // 00:05 CLT (03:05 UTC)
    timeZone: 'America/Santiago',
}, async () => {
    console.log('Starting daily metrics aggregation...');

    try {
        const db = getFirestore();

        // Calculate for yesterday (since this runs at midnight)
        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);

        const yesterdayEnd = new Date(yesterday);
        yesterdayEnd.setHours(23, 59, 59, 999);

        const metricId = formatDate(yesterday); // YYYY-MM-DD
        console.log(`Aggregating metrics for ${metricId}`);

        // 1. Total Users
        const usersSnapshot = await db.collection('users').get();
        const totalUsers = usersSnapshot.size;

        // 2. New Users Yesterday
        const newUsersSnapshot = await db.collection('users')
            .where('createdAt', '>=', yesterday)
            .where('createdAt', '<=', yesterdayEnd)
            .get();
        const newUsers = newUsersSnapshot.size;

        // 3. Active Users Yesterday (DAU)
        const activeUsersSnapshot = await db.collection('user_activities')
            .where('timestamp', '>=', yesterday)
            .where('timestamp', '<=', yesterdayEnd)
            .get();

        const uniqueUserIds = new Set<string>();
        activeUsersSnapshot.forEach(doc => {
            uniqueUserIds.add(doc.data().userId);
        });
        const activeUsers = uniqueUserIds.size;

        // 4. Total Sessions
        const totalSessions = activeUsersSnapshot.size;

        // 5. MRR and Users by Plan
        let mrr = 0;
        const usersByPlan = { free: 0, pro: 0, team: 0 };

        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            const planId = userData.subscription?.planId || 'free';

            // Count by plan
            if (planId === 'free') usersByPlan.free++;
            else if (planId === 'pro') usersByPlan.pro++;
            else if (planId === 'team') usersByPlan.team++;

            // Calculate MRR (only active subscriptions)
            if (userData.subscription?.status === 'active') {
                if (planId === 'pro') mrr += 9.99;
                else if (planId === 'team') mrr += 24.99;
            }
        });

        // 6. Average Session Duration (simplified - would need more detailed tracking)
        const avgSessionDuration = 0; // TODO: Calculate from user_activities

        // Save aggregated metrics
        await db.collection('daily_metrics').doc(metricId).set({
            date: FieldValue.serverTimestamp(),
            totalUsers,
            activeUsers,
            newUsers,
            totalSessions,
            avgSessionDuration,
            mrr: Math.round(mrr * 100) / 100, // Round to 2 decimals
            usersByPlan,
            createdAt: FieldValue.serverTimestamp(),
        });

        console.log(`✅ Daily metrics aggregated successfully for ${metricId}`);
        console.log(`   Total Users: ${totalUsers}`);
        console.log(`   New Users: ${newUsers}`);
        console.log(`   Active Users (DAU): ${activeUsers}`);
        console.log(`   MRR: $${mrr.toFixed(2)}`);
    } catch (error) {
        console.error('❌ Error aggregating daily metrics:', error);
        throw error;
    }
});

/**
 * Helper function to format date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
