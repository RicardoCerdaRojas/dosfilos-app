#!/usr/bin/env node
/**
 * Script to hide enterprise plan from Firestore
 * Run: node scripts/hideEnterprisePlan.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin with application default credentials
admin.initializeApp({
    projectId: 'dosfilosapp'
});

const db = admin.firestore();

async function hideEnterprisePlan() {
    try {
        console.log('🔄 Hiding enterprise plan from listings...\n');

        const planRef = db.collection('plans').doc('enterprise');
        const planDoc = await planRef.get();

        if (planDoc.exists) {
            console.log('📝 Current plan data:', planDoc.data());

            await planRef.update({
                isPublic: false,
                isActive: false
            });
            console.log('\n✅ Enterprise plan hidden successfully');
        } else {
            console.log('⚠️  Enterprise plan not found in Firestore');
        }

        // Show final state
        console.log('\n📊 Plans visibility:');
        const plansSnapshot = await db.collection('plans').get();
        plansSnapshot.forEach(doc => {
            const data = doc.data();
            const status = data.isPublic ? '✅ PUBLIC' : '❌ HIDDEN';
            console.log(`  ${status} - ${doc.id}: price=$${data.pricing?.monthly || 0}`);
        });

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit(0);
    }
}

hideEnterprisePlan();
