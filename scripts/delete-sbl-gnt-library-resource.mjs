#!/usr/bin/env node
/**
 * scripts/delete-sbl-gnt-library-resource.mjs
 *
 * Deletes the proof-of-concept SBL GNT 2 Peter doc that was seeded
 * into `library_resources` by `seed-sbl-gnt-system-source.mjs`.
 *
 * Why: modeling SBL GNT as a user-facing library resource turned out
 * to be the wrong call — biblical original-language text isn't an
 * "optional source the student might cite", it's the substrate of
 * NT exegesis. A separate path now wires `IOriginalLanguageBibleProvider`
 * (already implemented as `SBLGNTBibleProvider` in infrastructure)
 * directly into the canonical analyzer, so the Greek text reaches
 * the LLM without ever surfacing as a card in the user's library.
 *
 * The system-source library infrastructure (`isSystemSource` flag,
 * sentinel `__system__` userId, badge in ResourceCard, etc.) stays —
 * it's still useful for genuinely-resource-shaped shared content
 * (public-domain commentaries, free lexicons, etc.).
 *
 * Idempotent: skips when the doc no longer exists.
 *
 * Usage:
 *   node scripts/delete-sbl-gnt-library-resource.mjs           # dry run
 *   node scripts/delete-sbl-gnt-library-resource.mjs --apply   # writes Firestore
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
const docId = 'system-sbl-gnt-2pe';

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`Delete SBL GNT library resource — ${apply ? 'APPLY (deletes from Firestore)' : 'DRY RUN'}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');

const ref = db.collection('library_resources').doc(docId);
const snap = await ref.get();

if (!snap.exists) {
    console.log(`✓ Doc ${docId} doesn't exist — nothing to delete.`);
    process.exit(0);
}

console.log(`Found ${docId}:`);
console.log(`  title: ${snap.data().title}`);
console.log(`  userId: ${snap.data().userId}`);
console.log('');

if (!apply) {
    console.log('Dry-run mode. Re-run with --apply to delete.');
    process.exit(0);
}

await ref.delete();
console.log(`✓ Deleted ${docId}.`);
