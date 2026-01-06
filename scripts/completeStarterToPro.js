#!/usr/bin/env node
/**
 * Script to complete the plan migration: starter → pro
 * This handles the case where 'pro' already exists
 * 
 * Run: node scripts/completeStarterToPro.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin with application default credentials
admin.initializeApp({
    projectId: 'dosfilosapp'
});

const db = admin.firestore();

async function completeStarterToPro() {
    try {
        console.log('🔄 Completing starter → pro migration...\n');

        // Check current state
        const starterRef = db.collection('plans').doc('starter');
        const proRef = db.collection('plans').doc('pro');

        const [starterDoc, proDoc] = await Promise.all([
            starterRef.get(),
            proRef.get()
        ]);

        console.log('📊 Current state:');
        console.log(`   - "starter" exists: ${starterDoc.exists}`);
        console.log(`   - "pro" exists: ${proDoc.exists}\n`);

        if (!starterDoc.exists) {
            console.log('✅ No "starter" document found. Migration already complete!');
            await showPlansSummary();
            process.exit(0);
        }

        // Get starter data
        const starterData = starterDoc.data();
        console.log(`📄 Found "starter" document with name: "${starterData.name}"`);

        if (proDoc.exists) {
            const proData = proDoc.data();
            console.log(`⚠️  Found existing "pro" document with name: "${proData.name}"`);
            console.log('   This will be replaced with the data from "starter".\n');

            // Delete the existing pro document first
            await proRef.delete();
            console.log('   🗑️  Deleted existing "pro" document');
        }

        // Update the internal id field
        starterData.id = 'pro';

        // Create new pro document
        await proRef.set(starterData);
        console.log('   ✅ Created new "pro" document with starter data');

        // Delete starter document
        await starterRef.delete();
        console.log('   🗑️  Deleted "starter" document');

        // Update user subscriptions from 'starter' to 'pro'
        console.log('\n📋 Updating user subscriptions...');
        const usersSnapshot = await db.collection('users')
            .where('subscription.planId', '==', 'starter')
            .get();

        if (usersSnapshot.empty) {
            console.log('   ℹ️  No users with "starter" subscription found');
        } else {
            for (const userDoc of usersSnapshot.docs) {
                await db.collection('users').doc(userDoc.id).update({
                    'subscription.planId': 'pro'
                });
                console.log(`   ✅ Updated user ${userDoc.id}: subscription.planId=pro`);
            }
            console.log(`   ✅ Updated ${usersSnapshot.size} user(s)`);
        }

        console.log('\n✅ Migration completed successfully!\n');
        await showPlansSummary();

    } catch (error) {
        console.error('\n❌ Migration error:', error);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

async function showPlansSummary() {
    try {
        console.log('📊 Final plan structure:');
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

// Run
completeStarterToPro();
