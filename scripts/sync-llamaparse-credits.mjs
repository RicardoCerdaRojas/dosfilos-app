#!/usr/bin/env node
/**
 * scripts/sync-llamaparse-credits.mjs
 *
 * Manually overwrite the credits-used counter for one LlamaParse
 * account in our Firestore mirror. Use when our counter has drifted
 * from the LlamaParse dashboard (e.g. our `recordLlamaParseUsage`
 * counted pages on a job that LlamaParse later refunded, or someone
 * inflated the counter by mistake) and the selector starts skipping
 * the account as "exhausted".
 *
 * Source of truth = the LlamaParse dashboard's "Free plan usage"
 * counter. Read the number there, run this to sync our counter to
 * match. Optional `--limit` lets you also update the cap if it
 * changed (e.g. you upgraded the free tier limit).
 *
 * Usage:
 *   node scripts/sync-llamaparse-credits.mjs --account <id> --used <N>
 *   node scripts/sync-llamaparse-credits.mjs --account <id> --used <N> --limit <N>
 *
 * Tip: run `node scripts/check-llamaparse-accounts.mjs` first to see
 * the account IDs in Firestore.
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
const accountIdx = args.indexOf('--account');
const usedIdx = args.indexOf('--used');
const limitIdx = args.indexOf('--limit');

const accountId = accountIdx >= 0 ? args[accountIdx + 1] : null;
const usedRaw = usedIdx >= 0 ? args[usedIdx + 1] : null;
const limitRaw = limitIdx >= 0 ? args[limitIdx + 1] : null;

const used = usedRaw !== null ? parseInt(usedRaw, 10) : NaN;
const limit = limitRaw !== null ? parseInt(limitRaw, 10) : null;

if (!accountId || !Number.isFinite(used) || used < 0) {
    console.error('Usage:');
    console.error('  node scripts/sync-llamaparse-credits.mjs --account <id> --used <N> [--limit <N>]');
    console.error('');
    console.error('Find account ids with:');
    console.error('  node scripts/check-llamaparse-accounts.mjs');
    process.exit(1);
}
if (limit !== null && (!Number.isFinite(limit) || limit < 0)) {
    console.error('--limit must be a non-negative integer');
    process.exit(1);
}

const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
if (!projectId) {
    console.error('Missing VITE_FIREBASE_PROJECT_ID');
    process.exit(1);
}

if (!admin.apps.length) {
    admin.initializeApp({
        projectId,
        serviceAccountId: `${projectId}@appspot.gserviceaccount.com`,
    });
}

const db = admin.firestore();
const ref = db.collection('llamaparseAccounts').doc(accountId);
const snap = await ref.get();

if (!snap.exists) {
    console.error(`❌ Account "${accountId}" not found in llamaparseAccounts collection.`);
    console.error('   Run `node scripts/check-llamaparse-accounts.mjs` to see available ids.');
    process.exit(1);
}

const before = snap.data();
const beforeRemaining = (Number(before.creditsLimit) || 0) - (Number(before.creditsUsed) || 0);

console.log(`Account: ${accountId} (${before.name ?? '(no name)'})`);
console.log(`Before:`);
console.log(`  creditsUsed:   ${before.creditsUsed?.toLocaleString() ?? 0}`);
console.log(`  creditsLimit:  ${before.creditsLimit?.toLocaleString() ?? 0}`);
console.log(`  remaining:     ${beforeRemaining.toLocaleString()}`);
console.log('');

const update = {
    creditsUsed: used,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
};
if (limit !== null) {
    update.creditsLimit = limit;
}

await ref.update(update);

const after = (await ref.get()).data();
const afterRemaining = (Number(after.creditsLimit) || 0) - (Number(after.creditsUsed) || 0);

console.log(`After:`);
console.log(`  creditsUsed:   ${after.creditsUsed?.toLocaleString() ?? 0}`);
console.log(`  creditsLimit:  ${after.creditsLimit?.toLocaleString() ?? 0}`);
console.log(`  remaining:     ${afterRemaining.toLocaleString()}`);
console.log('');
console.log(`✅ Synced.`);

if (afterRemaining <= 0) {
    console.log('');
    console.log('⚠️  Account still has 0 remaining — cascade will skip it.');
    console.log('   Either bump --limit or wait for the monthly reset.');
}

process.exit(0);
