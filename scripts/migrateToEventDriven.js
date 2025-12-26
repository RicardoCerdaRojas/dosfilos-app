#!/usr/bin/env node
/**
 * Migration Script: Populate Event-Driven Analytics Collections
 * 
 * This script migrates existing data to the new event-driven analytics system:
 * - Creates user_analytics documents for all existing users
 * - Populates global_metrics/aggregate with platform totals
 * 
 * Run with: node scripts/migrateToEventDriven.js
 * Or with TypeScript: npx tsx scripts/migrateToEventDriven.ts
 */

const admin = require('firebase-admin');
const { FieldValue, Timestamp } = require('firebase-admin/firestore');

// Initialize Firebase Admin with application default credentials
admin.initializeApp({
    projectId: 'dosfilosapp'
});

const db = admin.firestore();

/**
 * Get latest timestamp from array of documents
 */
function getLatestTimestamp(docs) {
    if (docs.length === 0) return null;

    const timestamps = docs
        .map(doc => {
            const data = doc.data();
            return data.createdAt || data.timestamp || data.lastSaved;
        })
        .filter(t => t != null);

    if (timestamps.length === 0) return null;

    return timestamps.reduce((latest, current) => {
        return current.seconds > latest.seconds ? current : latest;
    });
}

/**
 * Count documents created in last 30 days
 */
function countLast30Days(docs) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoff = Timestamp.fromDate(thirtyDaysAgo);

    return docs.filter(doc => {
        const data = doc.data();
        const timestamp = data.createdAt || data.timestamp || data.lastSaved;
        return timestamp && timestamp.seconds >= cutoff.seconds;
    }).length;
}

/**
 * Migrate analytics for a single user
 */
async function migrateUser(userId) {
    console.log(`  Processing user: ${userId}`);

    // Fetch all user data in parallel
    const [sermonsSnap, greekSessionsSnap, seriesSnap, plansSnap, loginsSnap] = await Promise.all([
        db.collection('sermons').where('userId', '==', userId).get(),
        db.collection('greek_sessions').where('userId', '==', userId).get(),
        db.collection('sermon_series').where('userId', '==', userId).get(),
        db.collection('preaching_plans').where('userId', '==', userId).get(),
        db.collection('user_activities')
            .where('userId', '==', userId)
            .where('type', '==', 'login')
            .get(),
    ]);

    // Count sermons with wizardProgress (same logic as SermonInProgress component)
    const sermonsWithProgress = sermonsSnap.docs.filter(doc => {
        const data = doc.data();
        return data.wizardProgress !== undefined && data.wizardProgress !== null;
    });

    const publishedSermons = sermonsWithProgress.filter(doc => {
        const wizardProgress = doc.data().wizardProgress;
        return wizardProgress?.publishedCopyId !== undefined && wizardProgress?.publishedCopyId !== null;
    });

    const draftSermons = sermonsWithProgress.length - publishedSermons.length;

    // Count completed Greek sessions
    const completedSessions = greekSessionsSnap.docs.filter(doc =>
        doc.data().status === 'ACTIVE'
    );

    // Build analytics object
    const analytics = {
        userId,
        sermons: {
            total: sermonsWithProgress.length,
            published: publishedSermons.length,
            drafts: draftSermons,
            lastCreated: getLatestTimestamp(sermonsWithProgress),
        },
        greekSessions: {
            total: greekSessionsSnap.size,
            completed: completedSessions.length,
            lastSession: getLatestTimestamp(greekSessionsSnap.docs),
        },
        series: {
            total: seriesSnap.size,
            lastCreated: getLatestTimestamp(seriesSnap.docs),
        },
        preachingPlans: {
            total: plansSnap.size,
            lastCreated: getLatestTimestamp(plansSnap.docs),
        },
        logins: {
            total: loginsSnap.size,
            lastLogin: getLatestTimestamp(loginsSnap.docs),
            streak: 0, // Will be calculated going forward
        },
        last30Days: {
            sermons: countLast30Days(sermonsWithProgress),
            greekSessions: countLast30Days(greekSessionsSnap.docs),
            logins: countLast30Days(loginsSnap.docs),
        },
        updatedAt: FieldValue.serverTimestamp(),
        version: 1,
    };

    console.log(`    ✓ Sermons: ${analytics.sermons.total} (${analytics.sermons.published} published, ${analytics.sermons.drafts} drafts)`);
    console.log(`    ✓ Greek Sessions: ${analytics.greekSessions.total} (${analytics.greekSessions.completed} completed)`);
    console.log(`    ✓ Series: ${analytics.series.total}`);
    console.log(`    ✓ Plans: ${analytics.preachingPlans.total}`);
    console.log(`    ✓ Logins: ${analytics.logins.total}`);

    return analytics;
}

/**
 * Main migration function
 */
async function migrate() {
    console.log('🚀 Starting Event-Driven Analytics Migration...\n');

    try {
        // 1. Get all users
        console.log('📊 Step 1: Fetching all users...');
        const usersSnapshot = await db.collection('users').get();
        console.log(`Found ${usersSnapshot.size} users\n`);

        // 2. Migrate each user's analytics
        console.log('📊 Step 2: Migrating user analytics...');
        const userAnalytics = [];
        let successCount = 0;
        let errorCount = 0;

        for (const userDoc of usersSnapshot.docs) {
            try {
                const analytics = await migrateUser(userDoc.id);
                userAnalytics.push(analytics);

                // Write to user_analytics collection
                await db.doc(`user_analytics/${userDoc.id}`).set(analytics);
                successCount++;
            } catch (error) {
                console.error(`    ✗ Error migrating user ${userDoc.id}:`, error);
                errorCount++;
            }
        }

        console.log(`\n✓ User analytics migration complete: ${successCount} successful, ${errorCount} errors\n`);

        // 3. Calculate global aggregates
        console.log('📊 Step 3: Calculating global aggregates...');

        const totalUsers = usersSnapshot.size;
        const totalSermons = userAnalytics.reduce((sum, u) => sum + u.sermons.total, 0);
        const totalPublished = userAnalytics.reduce((sum, u) => sum + u.sermons.published, 0);
        const totalDrafts = userAnalytics.reduce((sum, u) => sum + u.sermons.drafts, 0);
        const totalGreekSessions = userAnalytics.reduce((sum, u) => sum + u.greekSessions.total, 0);
        const totalSeries = userAnalytics.reduce((sum, u) => sum + u.series.total, 0);
        const totalPlans = userAnalytics.reduce((sum, u) => sum + u.preachingPlans.total, 0);

        console.log(`  Total Users: ${totalUsers}`);
        console.log(`  Total Sermons: ${totalSermons} (${totalPublished} published, ${totalDrafts} drafts)`);
        console.log(`  Total Greek Sessions: ${totalGreekSessions}`);
        console.log(`  Total Series: ${totalSeries}`);
        console.log(`  Total Plans: ${totalPlans}`);

        // 4. Write global aggregate
        console.log('\n📊 Step 4: Writing global aggregate...');
        await db.doc('global_metrics/aggregate').set({
            allTime: {
                users: totalUsers,
                sermons: totalSermons,
                greekSessions: totalGreekSessions,
                series: totalSeries,
                plans: totalPlans,
            },
            currentMonth: {
                dau: 0, // Will be calculated by scheduled function
                mau: 0,
                mrr: 0,
            },
            lastUpdated: FieldValue.serverTimestamp(),
        });

        console.log('✓ Global aggregate created\n');

        // 5. Validation
        console.log('📊 Step 5: Validation...');
        const analyticsCount = (await db.collection('user_analytics').get()).size;
        console.log(`  user_analytics documents: ${analyticsCount}/${totalUsers}`);

        const aggregateDoc = await db.doc('global_metrics/aggregate').get();
        console.log(`  global aggregate exists: ${aggregateDoc.exists}`);

        if (analyticsCount === totalUsers && aggregateDoc.exists) {
            console.log('\n✅ Migration completed successfully!');
            console.log('\n📝 Next steps:');
            console.log('  1. Deploy Cloud Functions');
            console.log('  2. Test with new sermon creation');
            console.log('  3. Monitor Cloud Function logs');
            console.log('  4. Update frontend to read from new collections');
        } else {
            console.log('\n⚠️  Migration completed with warnings. Please review.');
        }

    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        throw error;
    } finally {
        process.exit(0);
    }
}

// Run migration
migrate().catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
});
