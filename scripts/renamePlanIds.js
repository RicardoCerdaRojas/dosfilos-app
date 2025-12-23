#!/usr/bin/env node
/**
 * Script to rename plan document IDs in Firestore
 * 
 * Changes:
 * - starter → pro
 * - pro → team
 * 
 * Run: node scripts/renamePlanIds.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin with application default credentials
admin.initializeApp({
    projectId: 'dosfilosapp'
});

const db = admin.firestore();

async function renamePlanDocuments() {
    try {
        console.log('🔄 Starting plan document ID migration...\n');

        // Step 1: Rename starter → pro
        console.log('📋 Step 1: Renaming "starter" → "pro"');
        await renamePlan('starter', 'pro');

        // Step 2: Rename pro → team
        console.log('\n📋 Step 2: Renaming "pro" → "team"');
        await renamePlan('pro', 'team');

        // Step 3: Update user subscriptions
        console.log('\n📋 Step 3: Updating user subscriptions...');
        await updateUserSubscriptions();

        console.log('\n✅ Migration completed successfully!');
        console.log('\n📊 Final plan structure:');
        await showPlansSummary();

    } catch (error) {
        console.error('\n❌ Migration error:', error);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

async function renamePlan(oldId, newId) {
    try {
        // Check if new document already exists
        const newDocRef = db.collection('plans').doc(newId);
        const newDoc = await newDocRef.get();

        if (newDoc.exists) {
            console.log(`   ⚠️  Document "${newId}" already exists. Skipping rename of "${oldId}".`);
            return;
        }

        // Get the old document
        const oldDocRef = db.collection('plans').doc(oldId);
        const oldDoc = await oldDocRef.get();

        if (!oldDoc.exists) {
            console.log(`   ⚠️  Document "${oldId}" not found. Skipping.`);
            return;
        }

        const data = oldDoc.data();
        console.log(`   📄 Found document "${oldId}"`);

        // Update the internal 'id' field to match the new document ID
        data.id = newId;

        // Create new document with the new ID
        await newDocRef.set(data);
        console.log(`   ✅ Created new document "${newId}"`);

        // Delete old document
        await oldDocRef.delete();
        console.log(`   🗑️  Deleted old document "${oldId}"`);

    } catch (error) {
        console.error(`   ❌ Error renaming "${oldId}" → "${newId}":`, error);
        throw error;
    }
}

async function updateUserSubscriptions() {
    try {
        const usersSnapshot = await db.collection('users').get();
        let updatedCount = 0;

        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data();
            let needsUpdate = false;
            const updates = {};

            // Check if user has a subscription with old plan IDs
            if (userData.subscription?.planId) {
                const oldPlanId = userData.subscription.planId;

                if (oldPlanId === 'starter') {
                    updates['subscription.planId'] = 'pro';
                    needsUpdate = true;
                } else if (oldPlanId === 'pro') {
                    updates['subscription.planId'] = 'team';
                    needsUpdate = true;
                }
            }

            if (needsUpdate) {
                await db.collection('users').doc(userDoc.id).update(updates);
                updatedCount++;
                console.log(`   ✅ Updated user ${userDoc.id}: ${Object.keys(updates).map(k => `${k}=${updates[k]}`).join(', ')}`);
            }
        }

        if (updatedCount === 0) {
            console.log('   ℹ️  No user subscriptions needed updating');
        } else {
            console.log(`   ✅ Updated ${updatedCount} user subscription(s)`);
        }

    } catch (error) {
        console.error('   ❌ Error updating user subscriptions:', error);
        throw error;
    }
}

async function showPlansSummary() {
    try {
        const plansSnapshot = await db.collection('plans').get();

        plansSnapshot.forEach(doc => {
            const data = doc.data();
            const visibility = data.isPublic ? '✅ PUBLIC' : '❌ HIDDEN';
            console.log(`  ${visibility} - ${doc.id}: "${data.name}" - $${data.pricing?.monthly || 0}/month`);
        });

    } catch (error) {
        console.error('Error showing plans summary:', error);
    }
}

// Run the migration
renamePlanDocuments();
