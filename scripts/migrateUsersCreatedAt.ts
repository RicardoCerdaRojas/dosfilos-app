/**
 * Migration Script: Add createdAt to existing users
 * 
 * This script adds the createdAt field to users who don't have it,
 * using Firebase Auth metadata as the source of truth.
 * 
 * Run this script ONCE to fix historical data.
 */

import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin (uses GOOGLE_APPLICATION_CREDENTIALS env var)
admin.initializeApp();

const db = getFirestore();
const auth = getAuth();

async function migrateUsersCreatedAt() {
    console.log('🚀 Starting migration: Adding createdAt to users without it...\n');

    try {
        // Get all users from Firestore
        const usersSnapshot = await db.collection('users').get();
        console.log(`📊 Found ${usersSnapshot.size} users in Firestore\n`);

        let updated = 0;
        let skipped = 0;
        let errors = 0;

        for (const userDoc of usersSnapshot.docs) {
            const userId = userDoc.id;
            const userData = userDoc.data();

            // Skip if user already has createdAt
            if (userData.createdAt) {
                skipped++;
                console.log(`⏭️  Skipping ${userData.email} - already has createdAt`);
                continue;
            }

            try {
                // Get Firebase Auth metadata
                const authUser = await auth.getUser(userId);
                const createdAt = new Date(authUser.metadata.creationTime);

                // Update Firestore document
                await db.collection('users').doc(userId).update({
                    createdAt: admin.firestore.Timestamp.fromDate(createdAt),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });

                updated++;
                console.log(`✅ Updated ${userData.email} - createdAt: ${createdAt.toISOString()}`);

            } catch (error: any) {
                errors++;
                console.error(`❌ Error updating ${userData.email}:`, error.message);
            }
        }

        console.log(`\n✨ Migration complete!`);
        console.log(`   Updated: ${updated}`);
        console.log(`   Skipped: ${skipped}`);
        console.log(`   Errors: ${errors}`);

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

// Run migration
migrateUsersCreatedAt()
    .then(() => {
        console.log('\n🎉 Done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Fatal error:', error);
        process.exit(1);
    });
