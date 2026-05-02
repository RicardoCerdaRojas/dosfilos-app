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
 *
 * Examples:
 *   node scripts/reprocess-llamaparse.mjs 406843cb-5dc2-4317-a672-45d5bf8fb1d1
 *   node scripts/reprocess-llamaparse.mjs <id> --force
 *
 * Auth:
 *   The callable verifies `request.auth.token.email === 'rdocerda@gmail.com'`,
 *   so we sign in with admin email/password via the Firebase Web SDK.
 *   Reads credentials from env vars when present, otherwise prompts
 *   interactively.
 *
 *     - FIREBASE_ADMIN_EMAIL    (defaults to 'rdocerda@gmail.com')
 *     - FIREBASE_ADMIN_PASSWORD (prompted if absent — input is masked)
 *
 *   Firebase config is read from `packages/web/.env.local` (the same
 *   VITE_FIREBASE_* values the app uses).
 *
 * Notes:
 *   - The callable can take up to 15 minutes for very large PDFs. The
 *     script keeps the connection open until the function responds.
 *   - On success, the resource's textExtractionStatus flips to 'ready'
 *     with extractionVersion='3.0-llamaparse', which fires the
 *     `autoIndexOnExtractionReady` trigger automatically — no extra
 *     "Procesar" click needed.
 */

import { config as loadEnv } from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import readline from 'node:readline';
import { Writable } from 'node:stream';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

// ── CLI args ────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const resourceId = args.find((a) => !a.startsWith('--'));
const force = args.includes('--force');

if (!resourceId) {
    console.error('Usage: node scripts/reprocess-llamaparse.mjs <resourceId> [--force]');
    process.exit(1);
}

// ── Firebase config ─────────────────────────────────────────────────────

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

function prompt(question) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}

function promptHidden(question) {
    return new Promise((resolve) => {
        const muted = new Writable({
            write(chunk, _enc, cb) {
                // Echo only the prompt text; suppress everything else.
                if (chunk.toString() === question) process.stdout.write(question);
                cb();
            },
        });
        const rl = readline.createInterface({ input: process.stdin, output: muted, terminal: true });
        rl.question(question, (answer) => {
            rl.close();
            process.stdout.write('\n');
            resolve(answer);
        });
    });
}

function formatDuration(ms) {
    const s = Math.round(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}m ${rem}s`;
}

// ── Main ────────────────────────────────────────────────────────────────

async function main() {
    const email = process.env.FIREBASE_ADMIN_EMAIL || 'rdocerda@gmail.com';
    const password = process.env.FIREBASE_ADMIN_PASSWORD || await promptHidden(`Password for ${email}: `);

    if (!password) {
        console.error('❌ Password required.');
        process.exit(1);
    }

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);

    console.log(`🔐 Signing in as ${email}...`);
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
        console.error('❌ Sign-in failed:', err.code || err.message);
        process.exit(1);
    }
    console.log('✓ Signed in');

    const functions = getFunctions(app, 'us-central1');
    // Default callable timeout is 70s — way too short for the 900s
    // worst-case of LlamaParse on a 1000+ page PDF. Bump to 16 min
    // (a touch over the 900s function timeout so we don't hang up
    // before it returns its final error).
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
