#!/usr/bin/env node
/**
 * Script to update user to free plan and hide enterprise plan
 * Run: node scripts/updateUserToFreePlan.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin with application default credentials
admin.initializeApp({
    projectId: 'dosfilosapp'
});

const db = admin.firestore();
const auth = admin.auth();

async function updateUserAndHidePlan() {
    try {
        // Get current authenticated user (you'll need to provide the email)
        console.log('🔍 Finding user...');

        // List all users to find yours
        const listUsersResult = await auth.listUsers(10);
        const users = listUsersResult.users;

        console.log('📋 Available users:');
        users.forEach((user, index) => {
            console.log(`  ${index + 1}. ${user.email} (UID: ${user.uid})`);
        });

        // Get the first user (likely you)
        const targetUser = users[0];
        console.log(`\n🎯 Updating user: ${targetUser.email}`);

        // Update user profile to free plan
        const userRef = db.collection('users').doc(targetUser.uid);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            console.log('⚠️  User document not found, creating one...');
            await userRef.set({
                email: targetUser.email,
                subscription: {
                    planId: 'free',
                    status: 'active'
                }
            });
        } else {
            console.log('📝 Current user data:', JSON.stringify(userDoc.data(), null, 2));
            await userRef.update({
                'subscription.planId': 'free',
                'subscription.status': 'active'
            });
            // Remove Stripe-related fields if they exist
            try {
                await userRef.update({
                    'subscription.stripeCustomerId': admin.firestore.FieldValue.delete(),
                    'subscription.stripeSubscriptionId': admin.firestore.FieldValue.delete(),
                    'subscription.currentPeriodEnd': admin.firestore.FieldValue.delete(),
                    'subscription.endDate': admin.firestore.FieldValue.delete()
                });
            } catch (err) {
                console.log('Note: Some fields may not exist, continuing...');
            }
        }

        console.log('✅ User updated to free plan');

        // Hide enterprise plan
        console.log('\n🔄 Hiding enterprise plan from listings...');
        const planRef = db.collection('plans').doc('iglesia');
        const planDoc = await planRef.get();

        if (planDoc.exists) {
            await planRef.update({
                isPublic: false,
                isActive: false
            });
            console.log('✅ Enterprise plan hidden');
        } else {
            console.log('⚠️  Enterprise plan not found in Firestore');
        }

        // Show final state
        console.log('\n📊 Final state:');
        const updatedUserDoc = await userRef.get();
        console.log('User subscription:', JSON.stringify(updatedUserDoc.data()?.subscription, null, 2));

        const plansSnapshot = await db.collection('plans').get();
        console.log('\nPlans visibility:');
        plansSnapshot.forEach(doc => {
            const data = doc.data();
            console.log(`  - ${doc.id}: isPublic=${data.isPublic}, price=$${data.pricing?.monthly || 0}`);
        });

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit(0);
    }
}

updateUserAndHidePlan();
