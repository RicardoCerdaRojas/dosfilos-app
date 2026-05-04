#!/usr/bin/env node
/**
 * scripts/check-llamaparse-accounts.mjs
 *
 * Diagnostic — prints the configured LlamaParse accounts and their
 * current usage so we can answer "why did the cascade skip
 * LlamaParse?" without opening Firebase Console.
 *
 * Reads the `llamaparseAccounts` collection (the same one the cloud
 * function's `selectAllLlamaParseAccounts()` queries) and reports:
 *   - account id / name
 *   - active flag
 *   - credits used / limit / remaining
 *   - apiKeySecretEnv name
 *   - last used timestamp
 *
 * Doesn't access the secrets themselves (no API keys printed).
 *
 * Usage:
 *   node scripts/check-llamaparse-accounts.mjs
 */

import admin from 'firebase-admin';
import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

loadEnv({ path: path.join(repoRoot, 'packages', 'web', '.env.local') });

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
const snap = await db.collection('llamaparseAccounts').get();

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('LlamaParse Accounts');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

if (snap.empty) {
    console.log('');
    console.log('  ⚠️  No accounts in `llamaparseAccounts` collection.');
    console.log('  Cascade falls back to legacy `LLAMAPARSE_API_KEY` env var.');
    console.log('  If that env is also unset, LlamaParse is silently skipped.');
    process.exit(0);
}

let totalAvailable = 0;
let activeCount = 0;
let usableCount = 0;

for (const doc of snap.docs) {
    const d = doc.data();
    const used = Number(d.creditsUsed) || 0;
    const limit = Number(d.creditsLimit) || 0;
    const remaining = limit - used;
    const active = d.active !== false;
    const lastUsed = d.lastUsedAt?.toDate?.()?.toISOString?.() ?? '—';
    const exhausted = remaining <= 0;

    console.log('');
    console.log(`  📄 ${doc.id} (${d.name ?? '(no name)'})`);
    console.log(`     active:           ${active ? '✓' : '✗'}`);
    console.log(`     priority:         ${d.priority ?? 100}`);
    console.log(`     credits:          ${used.toLocaleString()} / ${limit.toLocaleString()} (${remaining.toLocaleString()} remaining)`);
    console.log(`     apiKeySecretEnv:  ${d.apiKeySecretEnv ?? '(not set)'}`);
    console.log(`     lastUsedAt:       ${lastUsed}`);
    if (!active) console.log(`     ⚠️  account is INACTIVE`);
    if (exhausted) console.log(`     ⚠️  CREDITS EXHAUSTED — selector will skip this account`);

    if (active) activeCount++;
    if (active && remaining > 0) {
        usableCount++;
        totalAvailable += remaining;
    }
}

console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`  Total accounts:           ${snap.size}`);
console.log(`  Active accounts:          ${activeCount}`);
console.log(`  Usable (active + creds):  ${usableCount}`);
console.log(`  Total credits available:  ${totalAvailable.toLocaleString()}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

if (usableCount === 0) {
    console.log('');
    console.log('🚨 NO usable accounts. Cascade WILL skip LlamaParse.');
    console.log('   → Either bump the credit limits, mark inactive accounts active,');
    console.log('     or reset usedCredits if it\'s stale.');
}

process.exit(0);
