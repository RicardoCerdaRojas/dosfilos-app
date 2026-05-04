#!/usr/bin/env node
/**
 * scripts/promote-assembled-papers.mjs
 *
 * Backfill for papers stuck in `phase: 'in-progress'` even though
 * their assembly step was already accepted. Pre-fix the AcceptStepUseCase
 * never wrote `assembledMarkdown` or transitioned `phase` to
 * `'assembled'`, so the "Generar sermón" gate stayed disabled forever.
 *
 * Storage shape (FirestoreExegeticalPaperRepository):
 *   - Top-level `exegeticalPapers` collection
 *   - Each paper carries `steps: ExegeticalStep[]` INLINE (not a
 *     subcollection), where every step has `accepted: StepVersion | null`
 *     and `accepted.markdown` is the canonical content.
 *
 * What this script does:
 *   - Scan top-level `exegeticalPapers` (optionally filter by ownerId)
 *   - Find papers where the inline `steps` array contains an assembly
 *     step that's already accepted, but paper.phase != 'assembled'
 *   - Patch `assembledMarkdown` (from the accepted assembly version)
 *     and set `phase: 'assembled'`
 *
 * Defaults to dry-run; pass --apply to write.
 *
 * Usage:
 *   node scripts/promote-assembled-papers.mjs                       # dry-run, all papers
 *   node scripts/promote-assembled-papers.mjs --apply
 *   node scripts/promote-assembled-papers.mjs --apply --owner <email>
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
console.log(`Promote assembled papers — ${apply ? 'APPLY (writes Firestore)' : 'DRY RUN (no writes)'}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');

// Top-level collection (NOT nested under users/{uid}).
const papersCol = db.collection('exegeticalPapers');
const query = ownerUid
    ? papersCol.where('ownerId', '==', ownerUid)
    : papersCol;
const papersSnap = await query.get();

let scanned = 0;
let alreadyAssembled = 0;
let promoted = 0;
let stuckButNoAssembly = 0;
let stuckAssemblyNotAccepted = 0;
let errors = 0;

for (const paperDoc of papersSnap.docs) {
    scanned++;
    const data = paperDoc.data();
    const paperId = paperDoc.id;
    const title = (data.title ?? '(untitled)').substring(0, 50);

    if (data.phase === 'assembled') {
        alreadyAssembled++;
        continue;
    }
    if (data.phase === 'archived') {
        continue;
    }

    const steps = Array.isArray(data.steps) ? data.steps : [];
    const assemblyStep = steps.find(s => s?.kind === 'assembly');
    if (!assemblyStep) {
        stuckButNoAssembly++;
        console.log(`  ·  ${paperId} (${title}) — phase=${data.phase}, no assembly step yet`);
        continue;
    }

    const acceptedMarkdown = assemblyStep.accepted?.markdown;
    if (!acceptedMarkdown || assemblyStep.state !== 'accepted') {
        stuckAssemblyNotAccepted++;
        console.log(`  ·  ${paperId} (${title}) — phase=${data.phase}, assembly state=${assemblyStep.state ?? '—'}`);
        continue;
    }

    console.log(`  ${apply ? '✓' : '↻'} ${paperId} (${title}) — phase=${data.phase} → assembled, ${acceptedMarkdown.length} chars`);

    if (apply) {
        try {
            await paperDoc.ref.update({
                phase: 'assembled',
                assembledMarkdown: acceptedMarkdown,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            promoted++;
        } catch (err) {
            console.log(`     ⚠️  update failed: ${err.message ?? err}`);
            errors++;
        }
    } else {
        promoted++;
    }
}

console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`Summary`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`  Scanned papers:                        ${scanned}`);
console.log(`  Already assembled:                     ${alreadyAssembled}`);
console.log(`  Promoted${apply ? '' : ' (would be)'}:                  ${promoted}`);
console.log(`  Stuck — no assembly step:              ${stuckButNoAssembly}`);
console.log(`  Stuck — assembly not yet accepted:     ${stuckAssemblyNotAccepted}`);
console.log(`  Errors:                                ${errors}`);
console.log('');
if (!apply) {
    console.log('Re-run with --apply to actually write the changes.');
}

process.exit(0);
