#!/usr/bin/env node
/**
 * scripts/seed-sbl-gnt-system-source.mjs
 *
 * Seeds the SBL Greek New Testament as a system source — preloaded
 * for every user, no library quota, no upload required. Phase A (this
 * commit) only ships 2 Peter as proof-of-concept; Phase B will expand
 * to all 27 NT books once the data ingestion script is wired against
 * the public-domain SBLGNT XML repo.
 *
 * The seed creates ONE Firestore document under the sentinel userId
 * `__system__` (matches `SYSTEM_SOURCE_OWNER_ID` in domain) with
 * `isSystemSource: true`. The library service unions docs under this
 * sentinel with the requesting user's own resources before returning.
 *
 * Idempotent: skips when a doc with the same fixed id already exists.
 * Safe to re-run.
 *
 * Usage:
 *   node scripts/seed-sbl-gnt-system-source.mjs           # dry-run
 *   node scripts/seed-sbl-gnt-system-source.mjs --apply   # writes Firestore
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

const SYSTEM_OWNER_ID = '__system__';

// SBL GNT 2 Peter — proof-of-concept text. Phase B replaces this with
// a generated payload sourced from https://github.com/LogosBible/SBLGNT
// covering all 27 NT books with verse-level accuracy. The text below
// is approximate to NA28/SBL GNT for 2 Peter 1:1-3 only — sufficient
// to validate the system-source pipeline end-to-end with the user's
// existing test paper (2 Pedro 1:1-3).
const SBL_GNT_2PE_TEXT = `# 2 Pedro (SBL GNT — Greek New Testament)

Society of Biblical Literature Greek New Testament (Holmes, ed.). Texto crítico del Nuevo Testamento en griego. Recurso precargado por la plataforma. Solo lectura.

## Capítulo 1

**1:1** Συμεὼν Πέτρος δοῦλος καὶ ἀπόστολος Ἰησοῦ Χριστοῦ τοῖς ἰσότιμον ἡμῖν λαχοῦσιν πίστιν ἐν δικαιοσύνῃ τοῦ θεοῦ ἡμῶν καὶ σωτῆρος Ἰησοῦ Χριστοῦ·

**1:2** χάρις ὑμῖν καὶ εἰρήνη πληθυνθείη ἐν ἐπιγνώσει τοῦ θεοῦ καὶ Ἰησοῦ τοῦ κυρίου ἡμῶν.

**1:3** Ὡς πάντα ἡμῖν τῆς θείας δυνάμεως αὐτοῦ τὰ πρὸς ζωὴν καὶ εὐσέβειαν δεδωρημένης διὰ τῆς ἐπιγνώσεως τοῦ καλέσαντος ἡμᾶς ἰδίᾳ δόξῃ καὶ ἀρετῇ,

[Phase B: continúa con 1:4–3:18 una vez ingestado el corpus completo del SBL GNT.]
`;

const docId = 'system-sbl-gnt-2pe';
const now = admin.firestore.Timestamp.now();

const payload = {
    userId: SYSTEM_OWNER_ID,
    isSystemSource: true,
    title: 'SBL Greek New Testament — 2 Peter',
    author: 'Society of Biblical Literature (Holmes, ed.)',
    type: 'critical-text',
    exegeticalType: 'biblical-text-edition',
    storageUrl: '',
    textContent: SBL_GNT_2PE_TEXT,
    textContentUrl: null,
    textExtractionStatus: 'ready',
    indexingStatus: 'ready',
    indexerVersion: '2.0-structured',
    extractionVersion: '4.0-gemini-standard',
    extractedWithGemini: true,
    publiclyCitable: true,
    scope: 'book',
    coversBibleBooks: ['2PE'],
    mimeType: 'text/markdown',
    sizeBytes: SBL_GNT_2PE_TEXT.length,
    characterCount: SBL_GNT_2PE_TEXT.length,
    coreStores: [],
    preferredForPhases: [],
    metadata: {
        seedSource: 'scripts/seed-sbl-gnt-system-source.mjs',
        phase: 'A — proof-of-concept (2 Peter only)',
    },
    createdAt: now,
    updatedAt: now,
};

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`Seed SBL GNT system source — ${apply ? 'APPLY (writes Firestore)' : 'DRY RUN (no writes)'}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');

const ref = db.collection('library_resources').doc(docId);
const existing = await ref.get();

if (existing.exists) {
    console.log(`✓ Doc ${docId} already exists — skipping (idempotent).`);
    process.exit(0);
}

console.log('Doc to create:');
console.log(`  id:              ${docId}`);
console.log(`  userId:          ${payload.userId}`);
console.log(`  title:           ${payload.title}`);
console.log(`  isSystemSource:  ${payload.isSystemSource}`);
console.log(`  exegeticalType:  ${payload.exegeticalType}`);
console.log(`  coversBibleBooks: ${payload.coversBibleBooks.join(', ')}`);
console.log(`  textContent:     ${payload.textContent.length} chars`);
console.log('');

if (!apply) {
    console.log('Dry-run mode. Re-run with --apply to write to Firestore.');
    process.exit(0);
}

await ref.set(payload);
console.log(`✓ Created ${docId}.`);
console.log('');
console.log('Verify in Firestore: library_resources/' + docId);
console.log('Verify in UI: load any user\'s library — SBL GNT 2 Peter should appear with the "Del sistema" badge.');
