#!/usr/bin/env node
/**
 * Delete Test Geographic Events
 * 
 * This script removes all sample/test geographic events from the geo_events collection
 * Run with: node scripts/deleteTestGeoEvents.js
 */

const admin = require('firebase-admin');

admin.initializeApp({
    projectId: 'dosfilosapp'
});

const db = admin.firestore();

async function deleteTestGeoEvents() {
    console.log('🗑️  Starting deletion of test geographic events...\n');

    try {
        // Get all documents from geo_events
        const snapshot = await db.collection('geo_events').get();

        if (snapshot.empty) {
            console.log('No events found in geo_events collection.');
            process.exit(0);
        }

        console.log(`Found ${snapshot.size} events to delete.\n`);

        // Delete in batches of 500 (Firestore limit)
        const batchSize = 500;
        let deleted = 0;

        while (deleted < snapshot.size) {
            const batch = db.batch();
            const docsToDelete = snapshot.docs.slice(deleted, deleted + batchSize);

            docsToDelete.forEach(doc => {
                batch.delete(doc.ref);
            });

            await batch.commit();
            deleted += docsToDelete.length;
            console.log(`Deleted ${deleted}/${snapshot.size} events...`);
        }

        console.log('\n✅ All test geographic events deleted successfully!');
        console.log('\n📊 From now on, only real user events will be tracked.');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error deleting test events:', error);
        process.exit(1);
    }
}

deleteTestGeoEvents();
