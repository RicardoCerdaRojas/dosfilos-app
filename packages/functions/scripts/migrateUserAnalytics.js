/**
 * Migration Script: Populate Analytics for Existing Users
 * 
 * This script backfills the analytics field for existing users based on:
 * - Existing sermons count
 * - Last sermon creation date (as lastActivityAt)
 * - User's updatedAt as approximate lastLoginAt
 * 
 * Run this ONCE after deploying analytics Cloud Functions
 * 
 * Usage:
 *   node packages/functions/scripts/migrateUserAnalytics.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

async function migrateUserAnalytics() {
    console.log('🚀 Starting analytics migration...\n');

    try {
        // Get all users
        const usersSnapshot = await db.collection('users').get();
        console.log(`📊 Found ${usersSnapshot.size} users to process\n`);

        let processedCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;

        for (const userDoc of usersSnapshot.docs) {
            const userId = userDoc.id;
            const userData = userDoc.data();
            processedCount++;

            console.log(`[${processedCount}/${usersSnapshot.size}] Processing user: ${userData.email}`);

            // Skip if analytics field already exists and has data
            if (userData.analytics && userData.analytics.sermonsCreated > 0) {
                console.log(`  ⏭️  Skipping (already has analytics data)\n`);
                skippedCount++;
                continue;
            }

            // Count existing sermons for this user
            const sermonsSnapshot = await db.collection('sermons')
                .where('userId', '==', userId)
                .get();

            const sermonsCreated = sermonsSnapshot.size;

            // Find last sermon creation date
            let lastActivityAt = null;
            if (!sermonsSnapshot.empty) {
                const sermons = sermonsSnapshot.docs.map(doc => doc.data());
                const sortedSermons = sermons.sort((a, b) => {
                    const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
                    const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
                    return dateB - dateA;
                });
                lastActivityAt = sortedSermons[0].createdAt;
            }

            // Use updatedAt as approximate lastLoginAt if available
            const lastLoginAt = userData.updatedAt || userData.createdAt || admin.firestore.FieldValue.serverTimestamp();

            // Build analytics object
            const analytics = {
                loginCount: 1, // We don't have historical data, assume at least 1
                lastLoginAt: lastLoginAt,
                sermonsCreated: sermonsCreated,
                lastActivityAt: lastActivityAt || lastLoginAt,
                firstLoginAt: userData.createdAt || admin.firestore.FieldValue.serverTimestamp(),
            };

            // Update user document
            await db.collection('users').doc(userId).update({
                analytics: analytics,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            console.log(`  ✅ Updated analytics:`);
            console.log(`     - Sermons: ${sermonsCreated}`);
            console.log(`     - Login count: 1 (estimated)`);
            console.log(`     - Last activity: ${lastActivityAt ? new Date(lastActivityAt.toDate()).toISOString() : 'N/A'}\n`);

            updatedCount++;

            // Add small delay to avoid overwhelming Firestore
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log('\n✨ Migration completed!');
        console.log(`   Total users: ${processedCount}`);
        console.log(`   Updated: ${updatedCount}`);
        console.log(`   Skipped: ${skippedCount}`);

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

// Run migration
migrateUserAnalytics()
    .then(() => {
        console.log('\n👋 Migration finished successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Migration error:', error);
        process.exit(1);
    });
