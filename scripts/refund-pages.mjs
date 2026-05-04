#!/usr/bin/env node
/**
 * scripts/refund-pages.mjs
 *
 * One-off page-refund tool. Adds N pages back to a user's plan
 * bucket (and adjusts the spent counter accordingly). Used when a
 * test debit needs to be reversed, or to manually correct a balance
 * issue.
 *
 * Usage:
 *   node scripts/refund-pages.mjs --user <email> --mode <standard|premium> --pages <N>
 *   node scripts/refund-pages.mjs --user rdocerda@gmail.com --mode premium --pages 1020
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
const userIdx = args.indexOf('--user');
const modeIdx = args.indexOf('--mode');
const pagesIdx = args.indexOf('--pages');

const userEmail = userIdx >= 0 ? args[userIdx + 1] : null;
const mode = modeIdx >= 0 ? args[modeIdx + 1] : null;
const pages = pagesIdx >= 0 ? parseInt(args[pagesIdx + 1], 10) : NaN;

if (!userEmail || !mode || !Number.isFinite(pages) || pages <= 0) {
    console.error('Usage: node scripts/refund-pages.mjs --user <email> --mode <standard|premium> --pages <N>');
    process.exit(1);
}
if (mode !== 'standard' && mode !== 'premium') {
    console.error('--mode must be standard or premium');
    process.exit(1);
}

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

const user = await admin.auth().getUserByEmail(userEmail);
const db = admin.firestore();
const userRef = db.collection('users').doc(user.uid);

const before = (await userRef.get()).data()?.processingBalance ?? {};
const planField = `plan${mode.charAt(0).toUpperCase()}${mode.slice(1)}Pages`;
const availField = `${mode}PagesAvailable`;
const spentField = `${mode}SpentTotal`;

console.log(`User: ${userEmail} (uid=${user.uid.substring(0, 8)}...)`);
console.log(`Before:  ${planField} = ${before[planField] ?? 0}, ${availField} = ${before[availField] ?? 0}, ${spentField} = ${before[spentField] ?? 0}`);
console.log(`Refunding ${pages} ${mode} pages to plan bucket...`);

await userRef.update({
    [`processingBalance.${planField}`]: admin.firestore.FieldValue.increment(pages),
    [`processingBalance.${availField}`]: admin.firestore.FieldValue.increment(pages),
    [`processingBalance.${spentField}`]: admin.firestore.FieldValue.increment(-pages),
    'processingBalance.updatedAt': admin.firestore.FieldValue.serverTimestamp(),
});

const after = (await userRef.get()).data()?.processingBalance ?? {};
console.log(`After:   ${planField} = ${after[planField] ?? 0}, ${availField} = ${after[availField] ?? 0}, ${spentField} = ${after[spentField] ?? 0}`);
console.log(`✅ Refund complete`);

process.exit(0);
