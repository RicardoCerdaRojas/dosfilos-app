#!/usr/bin/env node
/**
 * scripts/promote-assembled-papers.mjs
 *
 * Backfill for papers stuck in `phase: 'in-progress'` even though
 * their assembly step was already accepted. Pre-fix the AcceptStepUseCase
 * never wrote `assembledMarkdown` or transitioned `phase` to
 * `'assembled'`, so the "Generar sermón" gate stayed disabled forever.
 *
 * What it does:
 *   - Scan papers (optionally scoped to one owner)
 *   - Find ones where the assembly step is accepted but the paper's
 *     phase is anything other than 'assembled'
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

// Papers live under users/{ownerId}/exegetical_papers/{paperId}.
// Steps live under .../exegetical_papers/{paperId}/steps/{stepId}.
let papersQuery = db.collectionGroup('exegetical_papers');
if (ownerUid) {
    papersQuery = db.collection('users').doc(ownerUid).collection('exegetical_papers');
}

const papersSnap = await papersQuery.get();

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
    const ownerId = paperDoc.ref.parent.parent?.id;
    const title = (data.title ?? '(untitled)').substring(0, 50);

    if (data.phase === 'assembled') {
        alreadyAssembled++;
        continue;
    }
    if (data.phase === 'archived') {
        continue;
    }

    // Look at the steps subcollection to find the assembly step.
    let stepsSnap;
    try {
        stepsSnap = await paperDoc.ref.collection('steps').get();
    } catch (err) {
        console.log(`  ⚠️  ${paperId} (${title}) — failed to read steps: ${err.message ?? err}`);
        errors++;
        continue;
    }

    const assemblyStep = stepsSnap.docs.find(d => d.data().kind === 'assembly');
    if (!assemblyStep) {
        stuckButNoAssembly++;
        continue;
    }

    const stepData = assemblyStep.data();
    const acceptedVersionId = stepData.acceptedVersionId ?? null;
    if (!acceptedVersionId || stepData.state !== 'accepted') {
        stuckAssemblyNotAccepted++;
        continue;
    }

    // Find the accepted version's markdown. Versions are stored in the
    // `versions` array on the step doc.
    const versions = (stepData.versions || []);
    const accepted = versions.find(v => v.id === acceptedVersionId);
    if (!accepted?.markdown) {
        console.log(`  ⚠️  ${paperId} (${title}) — accepted version ${acceptedVersionId} missing markdown`);
        errors++;
        continue;
    }

    console.log(`  ${apply ? '✓' : '↻'} ${paperId} (${title}) — phase=${data.phase} → assembled, ${accepted.markdown.length} chars`);

    if (apply) {
        try {
            await paperDoc.ref.update({
                phase: 'assembled',
                assembledMarkdown: accepted.markdown,
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
