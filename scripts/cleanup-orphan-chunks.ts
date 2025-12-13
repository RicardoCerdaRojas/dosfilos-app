/**
 * Cleanup script for orphaned document chunks
 * Run with: npx ts-node scripts/cleanup-orphan-chunks.ts
 */
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
const serviceAccount = require('../firebase-service-account.json');

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

const CHUNKS_COLLECTION = 'document_chunks';
const RESOURCES_COLLECTION = 'library_resources';

async function findOrphanedChunks(): Promise<string[]> {
    console.log('🔍 Finding orphaned chunks...\n');

    // Get all unique resourceIds from chunks
    const chunksSnapshot = await db.collection(CHUNKS_COLLECTION).get();
    const chunkResourceIds = new Set<string>();

    chunksSnapshot.docs.forEach(doc => {
        const resourceId = doc.data().resourceId;
        if (resourceId) {
            chunkResourceIds.add(resourceId);
        }
    });

    console.log(`📊 Found ${chunksSnapshot.size} total chunks`);
    console.log(`📊 Found ${chunkResourceIds.size} unique resource IDs in chunks\n`);

    // Check which resourceIds don't exist in library_resources
    const orphanedResourceIds: string[] = [];

    for (const resourceId of chunkResourceIds) {
        const resourceDoc = await db.collection(RESOURCES_COLLECTION).doc(resourceId).get();
        if (!resourceDoc.exists) {
            orphanedResourceIds.push(resourceId);
            // Count chunks for this orphaned resource
            const orphanChunks = chunksSnapshot.docs.filter(d => d.data().resourceId === resourceId);
            console.log(`⚠️  Orphaned: ${resourceId} (${orphanChunks.length} chunks)`);
        }
    }

    return orphanedResourceIds;
}

async function deleteOrphanedChunks(resourceIds: string[]): Promise<void> {
    if (resourceIds.length === 0) {
        console.log('\n✅ No orphaned chunks to delete!');
        return;
    }

    console.log(`\n🗑️  Deleting chunks for ${resourceIds.length} orphaned resources...`);

    for (const resourceId of resourceIds) {
        const chunksQuery = db.collection(CHUNKS_COLLECTION)
            .where('resourceId', '==', resourceId);

        const snapshot = await chunksQuery.get();
        console.log(`\n🗑️  Deleting ${snapshot.size} chunks for ${resourceId}...`);

        // Delete in small batches to avoid transaction size limit
        const batchSize = 50;
        let deleted = 0;

        for (let i = 0; i < snapshot.docs.length; i += batchSize) {
            const batch = db.batch();
            const batchDocs = snapshot.docs.slice(i, i + batchSize);

            for (const doc of batchDocs) {
                batch.delete(doc.ref);
            }

            await batch.commit();
            deleted += batchDocs.length;
            console.log(`   Deleted ${deleted}/${snapshot.size}`);
        }
    }

    console.log('\n✅ Cleanup complete!');
}

async function main() {
    console.log('🧹 Document Chunks Cleanup Script\n');
    console.log('='.repeat(50) + '\n');

    try {
        const orphanedIds = await findOrphanedChunks();

        if (orphanedIds.length > 0) {
            console.log(`\n📋 Summary: ${orphanedIds.length} orphaned resource(s) found`);
            await deleteOrphanedChunks(orphanedIds);
        } else {
            console.log('\n✅ Database is clean - no orphaned chunks found!');
        }
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

main();
