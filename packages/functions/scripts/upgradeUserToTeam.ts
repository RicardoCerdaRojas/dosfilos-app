#!/usr/bin/env ts-node
import * as admin from 'firebase-admin';


/**
 * Standalone script to upgrade rdocerda@gmail.com to Team plan
 * 
 * Prerequisites:
 * 1. Make sure you have the service account key for dosfilosapp
 * 2. Set GOOGLE_APPLICATION_CREDENTIALS environment variable
 * 
 * Usage:
 * npm run upgrade-user-to-team
 * 
 * Or manually:
 * GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json ts-node scripts/upgradeUserToTeam.ts
 */

const TARGET_EMAIL = 'rdocerda@gmail.com';
const TARGET_PLAN_ID = 'team';

// Initialize Firebase Admin
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!serviceAccountPath) {
    console.error('❌ Error: GOOGLE_APPLICATION_CREDENTIALS environment variable not set');
    console.error('Please set it to the path of your Firebase service account key JSON file');
    process.exit(1);
}

admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath),
    projectId: 'dosfilosapp',
});

const db = admin.firestore();

async function upgradeUser() {
    try {
        console.log('🚀 Starting user upgrade process...');
        console.log(`📧 Target email: ${TARGET_EMAIL}`);
        console.log(`📦 Target plan: ${TARGET_PLAN_ID}`);
        console.log('');

        // Step 1: Find the user by email
        console.log(`🔍 Searching for user...`);
        const usersSnapshot = await db.collection('users')
            .where('email', '==', TARGET_EMAIL)
            .limit(1)
            .get();

        if (usersSnapshot.empty) {
            console.error(`❌ User with email ${TARGET_EMAIL} not found`);
            process.exit(1);
        }

        const userDoc = usersSnapshot.docs[0];
        const userId = userDoc.id;
        const userData = userDoc.data();
        const currentPlan = userData.subscription?.planId || 'none';

        console.log(`✅ User found!`);
        console.log(`   ID: ${userId}`);
        console.log(`   Email: ${userData.email}`);
        console.log(`   Name: ${userData.displayName || 'N/A'}`);
        console.log(`   Current plan: ${currentPlan}`);
        console.log(`   Role: ${userData.role || 'user'}`);
        console.log('');

        // Step 2: Prepare the new subscription
        const now = admin.firestore.Timestamp.now();
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

        const updatedSubscription = {
            id: userData.subscription?.id || `sub_admin_${userId}`,
            planId: TARGET_PLAN_ID,
            status: 'active',
            stripePriceId: 'manual_upgrade_team', // Manual upgrade, no Stripe price
            startDate: userData.subscription?.startDate || now,
            currentPeriodStart: now,
            currentPeriodEnd: admin.firestore.Timestamp.fromDate(oneYearFromNow),
            cancelAtPeriodEnd: false,
            updatedAt: now
        };

        // Step 3: Update the user document
        console.log(`📝 Updating user subscription...`);
        await db.collection('users').doc(userId).update({
            subscription: updatedSubscription,
            updatedAt: now
        });

        console.log('');
        console.log('🎉 SUCCESS! User upgraded to Team plan');
        console.log('');
        console.log('📋 Updated subscription details:');
        console.log(`   Plan: ${TARGET_PLAN_ID}`);
        console.log(`   Status: active`);
        console.log(`   Valid until: ${oneYearFromNow.toLocaleDateString()}`);
        console.log('');
        console.log('✨ The user now has full access to all Team plan features!');

    } catch (error) {
        console.error('');
        console.error('❌ Error upgrading user:', error);
        process.exit(1);
    }
}

// Run the upgrade
upgradeUser()
    .then(() => {
        console.log('');
        console.log('👋 Done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
