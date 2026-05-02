#!/usr/bin/env node
/**
 * scripts/reprocess-llamaparse.mjs
 *
 * Re-extracts a library_resource using LlamaParse via the
 * `reprocessWithLlamaParse` callable. The callable has a 900s timeout
 * (vs the storage trigger's 540s hard cap), so this is the path for
 * documents that didn't fit in the storage-trigger window — typically
 * 1000+ page academic PDFs.
 *
 * Usage:
 *   node scripts/reprocess-llamaparse.mjs <resourceId> [--force]
 *   node scripts/reprocess-llamaparse.mjs <resourceId> [--as <email>]
 *
 * Auth strategy (NO password required):
 *   1. firebase-admin SDK uses Application Default Credentials (the
 *      same `gcloud auth application-default login` you already have
 *      for `firebase deploy`).
 *   2. Looks up the admin user by email and mints a custom token.
 *   3. Firebase Web SDK signs in with that custom token, which
 *      satisfies the callable's `request.auth.token.email` check.
 *
 * Defaults to `rdocerda@gmail.com` (matches the callable's hardcoded
 * admin check). Override with `--as <email>` if needed.
 *
 * Examples:
 *   node scripts/reprocess-llamaparse.mjs 406843cb-5dc2-4317-a672-45d5bf8fb1d1
 *   node scripts/reprocess-llamaparse.mjs <id> --force
 *   node scripts/reprocess-llamaparse.mjs <id> --as someone@dosfilos.app
 *
 * Notes:
 *   - The callable can take up to 15 minutes for very large PDFs.
 *   - On success, textExtractionStatus → 'ready', extractionVersion →
 *     '3.0-llamaparse', and `autoIndexOnExtractionReady` fires
 *     automatically.
 */

import { config as loadEnv } from 'dotenv';
import admin from 'firebase-admin';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signOut } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

// ── CLI args ────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const positional = args.filter((a) => !a.startsWith('--'));
const resourceId = positional[0];
const force = args.includes('--force');
const asIndex = args.indexOf('--as');
const adminEmail = asIndex >= 0 && args[asIndex + 1] ? args[asIndex + 1] : 'rdocerda@gmail.com';

if (!resourceId) {
    console.error('Usage: node scripts/reprocess-llamaparse.mjs <resourceId> [--force] [--as <email>]');
    process.exit(1);
}

// ── Firebase web SDK config (read from packages/web/.env.local) ─────────

loadEnv({ path: path.join(repoRoot, 'packages', 'web', '.env.local') });

const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey) {
    console.error('❌ Missing Firebase config. Verify packages/web/.env.local has VITE_FIREBASE_* set.');
    process.exit(1);
}

// ── Helpers ─────────────────────────────────────────────────────────────

function formatDuration(ms) {
    const s = Math.round(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}m ${rem}s`;
}

// ── Main ────────────────────────────────────────────────────────────────

async function main() {
    // Step 1 — admin SDK with ADC. Same auth as the rest of the
    // scripts/ folder (no password, no service account JSON).
    if (!admin.apps.length) {
        admin.initializeApp({ projectId: firebaseConfig.projectId });
    }

    console.log(`🔍 Looking up admin user ${adminEmail}...`);
    let adminUser;
    try {
        adminUser = await admin.auth().getUserByEmail(adminEmail);
    } catch (err) {
        if (err.code === 'auth/user-not-found') {
            console.error(`❌ User ${adminEmail} not found in Firebase Auth.`);
        } else {
            console.error(`❌ Lookup failed:`, err.message || err);
            console.error('   Hint: run `gcloud auth application-default login` if ADC is missing.');
        }
        process.exit(1);
    }
    console.log(`✓ Found user uid=${adminUser.uid}`);

    // Step 2 — mint a custom token. The web SDK signs in with this
    // and gets a real ID token whose `email` claim matches the
    // callable's check. We pass the email in additional claims so
    // it lands in the token, plus rely on the user's own email
    // verification (Firebase auto-fills .email on the resulting
    // ID token from the user record).
    console.log(`🎫 Minting custom token...`);
    const customToken = await admin.auth().createCustomToken(adminUser.uid);

    // Step 3 — web SDK sign-in with the custom token, then call
    // the callable. Web SDK is the only path that gives us the
    // `request.auth` context the callable expects.
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);

    console.log(`🔐 Signing in via custom token...`);
    await signInWithCustomToken(auth, customToken);
    console.log(`✓ Signed in as ${auth.currentUser?.email ?? adminUser.email}`);

    const functions = getFunctions(app, 'us-central1');
    // Default callable timeout is 70s — way too short for a 15-min
    // LlamaParse run. Bump to 16 min so we don't hang up before the
    // function returns.
    const reprocess = httpsCallable(functions, 'reprocessWithLlamaParse', {
        timeout: 16 * 60 * 1000,
    });

    console.log(`🦙 Invoking reprocessWithLlamaParse(resourceId=${resourceId}, force=${force})...`);
    console.log('   This can take up to 15 minutes for large PDFs. Stay put.');

    const startedAt = Date.now();
    let exitCode = 0;
    try {
        const result = await reprocess({ resourceId, force });
        const elapsed = formatDuration(Date.now() - startedAt);
        console.log(`✅ Completed in ${elapsed}.`);
        console.log('Result:', JSON.stringify(result.data, null, 2));
    } catch (err) {
        const elapsed = formatDuration(Date.now() - startedAt);
        console.error(`❌ Failed after ${elapsed}:`, err.code || '', err.message || err);
        if (err.details) console.error('Details:', err.details);
        exitCode = 1;
    } finally {
        try { await signOut(auth); } catch { /* swallow */ }
    }

    process.exit(exitCode);
}

main().catch((err) => {
    console.error('💥 Fatal:', err);
    process.exit(1);
});
