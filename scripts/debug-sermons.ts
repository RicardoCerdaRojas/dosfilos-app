/**
 * Debug script to inspect sermon documents
 * Run with: npx ts-node scripts/debug-sermons.ts ID1 ID2
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({
    credential: applicationDefault(),
    projectId: 'dosfilosapp'
});

const db = getFirestore();

async function main() {
    const ids = process.argv.slice(2);

    if (ids.length === 0) {
        console.log('Usage: npx ts-node scripts/debug-sermons.ts ID1 ID2 ...');
        return;
    }

    console.log('🔍 Inspecting sermons...\n');

    for (const id of ids) {
        console.log(`\n📄 Sermon: ${id}`);
        console.log('='.repeat(60));

        const doc = await db.collection('sermons').doc(id).get();

        if (!doc.exists) {
            console.log('   ❌ NOT FOUND');
            continue;
        }

        const data = doc.data()!;
        console.log(`   Title: ${data.title}`);
        console.log(`   Status: ${data.status}`);
        console.log(`   SourceSermonId: ${data.sourceSermonId || 'N/A'}`);
        console.log(`   CreatedAt: ${data.createdAt?.toDate?.() || data.createdAt}`);
        console.log(`   PublishedAt: ${data.publishedAt?.toDate?.() || data.publishedAt || 'N/A'}`);
        console.log(`   Has WizardProgress: ${!!data.wizardProgress}`);
        console.log(`   Content Length: ${data.content?.length || 0} chars`);
    }
}

main().catch(console.error);
