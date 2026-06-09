#!/usr/bin/env node
// One-off: wipe a target user's cloned library (resources + chunks + storage),
// leaving the user profile/plan intact. Used to recover from a partial clone.
// Run: node scripts/_cleanupAmbassadorPartial.mjs <targetUid> [--commit]
import admin from 'firebase-admin';

const PROJECT_ID = 'dosfilosapp';
const BUCKET = 'dosfilosapp.firebasestorage.app';
const TARGET = process.argv[2];
const COMMIT = process.argv.includes('--commit');
if (!TARGET) { console.error('usage: node _cleanupAmbassadorPartial.mjs <targetUid> [--commit]'); process.exit(1); }

admin.initializeApp({ projectId: PROJECT_ID, storageBucket: BUCKET });
const db = admin.firestore();
const tag = COMMIT ? '' : '[DRY] ';

async function deleteQuery(coll, field) {
    let total = 0;
    while (true) {
        const snap = await db.collection(coll).where(field, '==', TARGET).limit(300).get();
        if (snap.empty) break;
        total += snap.size;
        if (COMMIT) {
            let batch = db.batch(); let n = 0;
            for (const d of snap.docs) { batch.delete(d.ref); if (++n % 300 === 0) { await batch.commit(); batch = db.batch(); } }
            await batch.commit();
        } else break; // dry: one page is enough to report
    }
    console.log(`${tag}delete ${coll} where ${field}==target : ${COMMIT ? total : snap_count(coll)} `);
}
// helper for dry count
async function count(coll, field) {
    const s = await db.collection(coll).where(field, '==', TARGET).get();
    return s.size;
}

(async () => {
    console.log(`\n=== cleanup target ${TARGET} ${COMMIT ? '(COMMIT)' : '(DRY)'} ===`);
    const resCount = await count('library_resources', 'userId');
    const chunkCount = await count('document_chunks', 'userId');
    console.log(`library_resources: ${resCount}, document_chunks: ${chunkCount}`);

    if (COMMIT) {
        // delete chunks (batch of 50: embedding arrays generate many index
        // deletions per doc, so 300 blows the "transaction too big" cap)
        let deletedChunks = 0;
        while (true) {
            const snap = await db.collection('document_chunks').where('userId', '==', TARGET).limit(50).get();
            if (snap.empty) break;
            const batch = db.batch();
            snap.docs.forEach(d => batch.delete(d.ref));
            await batch.commit();
            deletedChunks += snap.size;
            if (deletedChunks % 1000 === 0) console.log(`  deleted ${deletedChunks} chunks...`);
        }
        console.log(`  deleted ${deletedChunks} chunks total`);
        // delete resources
        while (true) {
            const snap = await db.collection('library_resources').where('userId', '==', TARGET).limit(100).get();
            if (snap.empty) break;
            const batch = db.batch();
            snap.docs.forEach(d => batch.delete(d.ref));
            await batch.commit();
            console.log(`  deleted ${snap.size} resources`);
        }
        // delete storage prefix
        const bucket = admin.storage().bucket(BUCKET);
        await bucket.deleteFiles({ prefix: `users/${TARGET}/library/` });
        console.log(`  deleted storage prefix users/${TARGET}/library/`);
    }
    console.log('done.\n');
    process.exit(0);
})().catch(e => { console.error('FAILED', e); process.exit(1); });
