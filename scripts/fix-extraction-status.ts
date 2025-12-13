#!/usr/bin/env node

/**
 * Script to update textExtractionStatus for existing documents
 * Run with: npx ts-node scripts/fix-extraction-status.ts
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin with default credentials
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: 'dosfilosapp'
    });
}

const db = admin.firestore();

async function fixExtractionStatus() {
    console.log('🔄 Starting textExtractionStatus migration...\n');

    const resourcesRef = db.collection('library_resources');
    const snapshot = await resourcesRef.get();

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const doc of snapshot.docs) {
        const data = doc.data();
        const resourceId = doc.id;

        try {
            // Check if textExtractionStatus already exists and is valid
            if (data.textExtractionStatus === 'ready') {
                console.log(`⏭️  ${resourceId}: Already set to 'ready'`);
                skipped++;
                continue;
            }

            // If textContent exists, mark as ready
            if (data.textContent && data.textContent.length > 0) {
                await doc.ref.update({
                    textExtractionStatus: 'ready',
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                console.log(`✅ ${resourceId}: Updated to 'ready' (has ${data.textContent.length} chars)`);
                updated++;
            } else {
                // No text content, keep as pending
                if (!data.textExtractionStatus) {
                    await doc.ref.update({
                        textExtractionStatus: 'pending',
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                    console.log(`⏳ ${resourceId}: Set to 'pending' (no text content)`);
                    updated++;
                } else {
                    console.log(`⏭️  ${resourceId}: Already has status '${data.textExtractionStatus}'`);
                    skipped++;
                }
            }
        } catch (error) {
            console.error(`❌ ${resourceId}: Error updating -`, error);
            errors++;
        }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   Total documents: ${snapshot.size}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Errors: ${errors}`);
    console.log('\n✅ Migration complete!');
}

fixExtractionStatus()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
