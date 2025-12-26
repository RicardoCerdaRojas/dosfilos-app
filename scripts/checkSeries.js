#!/usr/bin/env node
/**
 * Check structure of series collection
 */

const admin = require('firebase-admin');

admin.initializeApp({
    projectId: 'dosfilosapp'
});

const db = admin.firestore();

async function checkSeries() {
    console.log('🔍 Checking series collections...\n');

    // Check sermon_series
    const sermonSeriesSnap = await db.collection('sermon_series').limit(3).get();
    console.log(`sermon_series: ${sermonSeriesSnap.size} documents`);
    sermonSeriesSnap.docs.forEach((doc, i) => {
        const data = doc.data();
        console.log(`  ${i + 1}. userId: ${data.userId || data.createdBy || 'N/A'}, title: ${data.title || data.name || 'N/A'}`);
    });

    console.log('');

    // Check series
    const seriesSnap = await db.collection('series').limit(3).get();
    console.log(`series: ${seriesSnap.size} documents`);
    seriesSnap.docs.forEach((doc, i) => {
        const data = doc.data();
        console.log(`  ${i + 1}. userId: ${data.userId || data.createdBy || 'N/A'}, title: ${data.title || data.name || 'N/A'}`);
    });

    process.exit(0);
}

checkSeries().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
