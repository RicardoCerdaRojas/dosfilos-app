#!/usr/bin/env node
/**
 * Check structure of preaching_plans collection
 */

const admin = require('firebase-admin');

admin.initializeApp({
    projectId: 'dosfilosapp'
});

const db = admin.firestore();

async function checkPlans() {
    console.log('🔍 Checking preaching_plans structure...\n');

    const plansSnap = await db.collection('preaching_plans').limit(5).get();

    console.log(`Found ${plansSnap.size} plans\n`);

    plansSnap.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`Plan ${index + 1}:`);
        console.log(`  ID: ${doc.id}`);
        console.log(`  Fields:`, Object.keys(data));
        console.log(`  Sample:`, JSON.stringify(data, null, 2));
        console.log('');
    });

    process.exit(0);
}

checkPlans().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
