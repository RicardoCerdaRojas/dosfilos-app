#!/usr/bin/env node
/**
 * scripts/backfill-indexing-status.mjs
 *
 * One-shot migration: writes `indexingStatus: 'ready'` (+ indexerVersion
 * + indexedChunkCount) onto every library_resource that
 *   1. has `textExtractionStatus === 'ready'`
 *   2. but no `indexingStatus` field set
 *   3. AND has chunks in `document_chunks` (the source of truth for
 *      "is this resource queryable")
 *
 * Why: pre-cloud-function legacy resources were indexed without ever
 * writing the indexer-state fields onto their doc. The library card
 * detects them via an async chunks-query fallback and shows "Listo",
 * but the exegesis corpus picker reads `indexingStatus` directly and
 * shows "Sin indexar". After this migration both views agree from the
 * single field on the resource doc.
 *
 * Safe to re-run: only updates resources missing `indexingStatus`. If
 * the field is already set (failed/processing/ready), the resource is
 * skipped — never overwrites an explicit state.
 *
 * Usage:
 *   node scripts/backfill-indexing-status.mjs           # dry-run by default
 *   node scripts/backfill-indexing-status.mjs --apply   # actually write
 *   node scripts/backfill-indexing-status.mjs --apply --owner <email>
 */

import admin from 'firebase-admin';
import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

loadEnv({ path: path.join(repoRoot, 'packages', 'web', '.env.local') });

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const ownerIdx = args.indexOf('--owner');
const ownerEmail = ownerIdx >= 0 ? args[ownerIdx + 1] : null;

const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
if (!projectId) {
    console.error('Missing VITE_FIREBASE_PROJECT_ID in packages/web/.env.local');
    process.exit(1);
}

if (!admin.apps.length) {
    admin.initializeApp({
        projectId,
        serviceAccountId: `${projectId}@appspot.gserviceaccount.com`,
    });
}

const db = admin.firestore();
const INDEXER_VERSION = '2.0-structured';

// Optional owner filter — useful for scoping the migration to a single
// user's library while testing.
let ownerUid = null;
if (ownerEmail) {
    try {
        const u = await admin.auth().getUserByEmail(ownerEmail);
        ownerUid = u.uid;
        console.log(`📋 Scoped to owner ${ownerEmail} (uid=${ownerUid.substring(0, 8)}...)`);
    } catch {
        console.error(`❌ Owner ${ownerEmail} not found`);
        process.exit(1);
    }
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`Backfill indexingStatus — ${apply ? 'APPLY (writes Firestore)' : 'DRY RUN (no writes)'}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');

let q = db.collection('library_resources').where('textExtractionStatus', '==', 'ready');
if (ownerUid) q = q.where('userId', '==', ownerUid);
const snap = await q.get();

let scanned = 0;
let alreadyReady = 0;
let alreadyOther = 0;
let backfilled = 0;
let noChunks = 0;
let errors = 0;

for (const doc of snap.docs) {
    scanned++;
    const data = doc.data();
    const id = doc.id;
    const title = (data.title ?? '(untitled)').substring(0, 60);

    if (data.indexingStatus === 'ready') {
        alreadyReady++;
        continue;
    }
    if (data.indexingStatus === 'processing' || data.indexingStatus === 'failed') {
        alreadyOther++;
        continue;
    }

    // No indexingStatus → check chunks.
    let chunkCount = 0;
    try {
        const cs = await db
            .collection('document_chunks')
            .where('resourceId', '==', id)
            .count()
            .get();
        chunkCount = cs.data().count;
    } catch (err) {
        console.log(`  ⚠️  ${id} (${title}) — chunk count failed: ${err.message ?? err}`);
        errors++;
        continue;
    }

    if (chunkCount === 0) {
        noChunks++;
        continue;
    }

    console.log(`  ${apply ? '✓' : '↻'} ${id} (${title}) — ${chunkCount} chunks → indexingStatus=ready`);

    if (apply) {
        try {
            await doc.ref.update({
                indexingStatus: 'ready',
                indexerVersion: INDEXER_VERSION,
                indexedChunkCount: chunkCount,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            backfilled++;
        } catch (err) {
            console.log(`     ⚠️  update failed: ${err.message ?? err}`);
            errors++;
        }
    } else {
        backfilled++;
    }
}

console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`Summary`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`  Scanned (textExtractionStatus=ready):  ${scanned}`);
console.log(`  Already indexingStatus=ready:          ${alreadyReady}`);
console.log(`  Already processing/failed:             ${alreadyOther}`);
console.log(`  Backfilled${apply ? '' : ' (would be)'}:                ${backfilled}`);
console.log(`  No chunks (skipped):                   ${noChunks}`);
console.log(`  Errors:                                ${errors}`);
console.log('');
if (!apply) {
    console.log('Re-run with --apply to actually write the changes.');
}

process.exit(0);
