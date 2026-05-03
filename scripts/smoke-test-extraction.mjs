#!/usr/bin/env node
/**
 * scripts/smoke-test-extraction.mjs
 *
 * End-to-end smoke test for the library extraction → indexing pipeline.
 * Uploads a PDF, watches it through the cascade, and reports
 * pass/fail with the actual final state — so you can verify
 * deterministically that a deploy works instead of guessing from
 * the UI.
 *
 * What it covers:
 *   1. Storage upload triggers `extractPdfWithGemini`
 *   2. The cascade picks an engine (LlamaParse / Gemini / pdf-parse)
 *      respecting the `requestedExtractionMode` field
 *   3. The Firestore trigger `autoIndexOnExtractionReady` fires
 *   4. The chunker + embedder produce indexed chunks
 *   5. The resource ends up `indexingStatus === 'ready'` with
 *      `indexedChunkCount > 0`
 *
 * What "pass" means:
 *   - Resource reaches `textExtractionStatus === 'ready'`
 *   - AND `indexingStatus === 'ready'`
 *   - AND `indexedChunkCount > 0`
 *   - within --timeout seconds (default 600 = 10 min)
 *
 * What "fail" means:
 *   - Timeout: any state other than the above
 *   - Hard fail: `textExtractionStatus === 'failed'` or
 *     `indexingStatus === 'failed'` — these end the wait
 *     immediately and dump the error fields
 *
 * Usage:
 *   node scripts/smoke-test-extraction.mjs <pdf-path> [options]
 *
 * Options:
 *   --mode <standard|premium>   Tier to request (default: standard)
 *   --as <email>                Run as this user (default: rdocerda@gmail.com)
 *   --timeout <seconds>         Wait timeout (default: 600)
 *   --keep                      Keep the resource in the library after the test
 *   --sa <sa-email>             Service account to impersonate for ADC
 *
 * Pages are ALWAYS refunded after the test, regardless of --keep — the
 * smoke test is validation, not consumption. Without --keep the test
 * artifact is deleted; with --keep you also get the processed
 * resource in your library at no page cost. Both flows refund.
 *
 * Examples:
 *   node scripts/smoke-test-extraction.mjs /tmp/sample.pdf
 *   node scripts/smoke-test-extraction.mjs ~/Downloads/wbc-jude.pdf --mode standard
 *   node scripts/smoke-test-extraction.mjs ~/Downloads/ntg28.pdf --mode premium --keep
 *
 * Auth:
 *   Uses Application Default Credentials (`gcloud auth
 *   application-default login`) + IAM signJwt for the custom token —
 *   same pattern as scripts/reprocess-llamaparse.mjs.
 */

import { config as loadEnv } from 'dotenv';
import admin from 'firebase-admin';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

// ── CLI args ────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const positional = args.filter((a) => !a.startsWith('--'));
const pdfPath = positional[0];
const modeIdx = args.indexOf('--mode');
const mode = modeIdx >= 0 && args[modeIdx + 1] ? args[modeIdx + 1] : 'standard';
const asIdx = args.indexOf('--as');
const adminEmail = asIdx >= 0 && args[asIdx + 1] ? args[asIdx + 1] : 'rdocerda@gmail.com';
const timeoutIdx = args.indexOf('--timeout');
const timeoutSeconds = timeoutIdx >= 0 && args[timeoutIdx + 1]
    ? parseInt(args[timeoutIdx + 1], 10)
    : 600;
const keepResource = args.includes('--keep');
const saIdx = args.indexOf('--sa');

if (!pdfPath) {
    console.error('Usage:');
    console.error('  node scripts/smoke-test-extraction.mjs <pdf-path> [--mode standard|premium] [--as <email>] [--timeout <seconds>] [--keep]');
    console.error('');
    console.error('Example:');
    console.error('  node scripts/smoke-test-extraction.mjs ~/Downloads/sample.pdf --mode standard');
    process.exit(1);
}

if (!fs.existsSync(pdfPath)) {
    console.error(`❌ PDF not found: ${pdfPath}`);
    process.exit(1);
}

if (mode !== 'standard' && mode !== 'premium') {
    console.error(`❌ --mode must be 'standard' or 'premium' (got: ${mode})`);
    process.exit(1);
}

// ── Firebase config ─────────────────────────────────────────────────────

loadEnv({ path: path.join(repoRoot, 'packages', 'web', '.env.local') });

const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
const bucketName = process.env.VITE_FIREBASE_STORAGE_BUCKET;

if (!projectId || !bucketName) {
    console.error('❌ Missing Firebase config. Verify packages/web/.env.local has VITE_FIREBASE_PROJECT_ID and VITE_FIREBASE_STORAGE_BUCKET.');
    process.exit(1);
}

const serviceAccountId = saIdx >= 0 && args[saIdx + 1]
    ? args[saIdx + 1]
    : `${projectId}@appspot.gserviceaccount.com`;

// ── Helpers ─────────────────────────────────────────────────────────────

function fmtDuration(ms) {
    const s = Math.round(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    return `${m}m ${s % 60}s`;
}

function statusLine(data, elapsedMs) {
    const ext = data.textExtractionStatus ?? '—';
    const idx = data.indexingStatus ?? '—';
    const ver = data.extractionVersion ?? '—';
    const chunks = data.indexedChunkCount ?? '—';
    return `[${fmtDuration(elapsedMs).padStart(6)}] extraction=${ext.padEnd(10)} indexing=${idx.padEnd(10)} version=${ver.padEnd(25)} chunks=${chunks}`;
}

// ── Main ────────────────────────────────────────────────────────────────

async function main() {
    if (!admin.apps.length) {
        admin.initializeApp({
            projectId,
            serviceAccountId,
            storageBucket: bucketName,
        });
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Extraction Pipeline Smoke Test');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  PDF:       ${pdfPath}`);
    console.log(`  Mode:      ${mode}`);
    console.log(`  As:        ${adminEmail}`);
    console.log(`  Timeout:   ${timeoutSeconds}s`);
    console.log(`  Cleanup:   ${keepResource ? 'keep resource' : 'delete after test'}`);
    console.log('');

    // 1. Resolve the user.
    let user;
    try {
        user = await admin.auth().getUserByEmail(adminEmail);
    } catch (err) {
        console.error(`❌ User ${adminEmail} not found in Firebase Auth.`);
        console.error(`   ${err.message ?? err}`);
        process.exit(1);
    }
    const userId = user.uid;
    console.log(`✓ User: ${adminEmail} (uid=${userId.substring(0, 8)}...)`);

    // 2. Prepare upload payload.
    const fileBuffer = fs.readFileSync(pdfPath);
    const fileSizeBytes = fileBuffer.length;
    const fileSizeMB = (fileSizeBytes / 1024 / 1024).toFixed(2);
    const filename = path.basename(pdfPath);
    const baseTitle = filename.replace(/\.[^/.]+$/, '');
    // Tag the title so it's obvious which resources are smoke-test
    // artifacts, in case --keep leaves them around.
    const title = `[smoke-test] ${baseTitle}`;
    const author = 'smoke-test';

    const resourceId = randomUUID();
    const storagePath = `users/${userId}/library/${resourceId}/${filename}`;

    console.log(`✓ File: ${filename} (${fileSizeMB} MB)`);
    console.log(`✓ Resource id: ${resourceId}`);
    console.log('');

    // 3. Upload to Storage. The storage trigger fires on object
    //    finalize → starts extraction.
    console.log(`⬆️  Uploading to ${storagePath}...`);
    const bucket = admin.storage().bucket(bucketName);
    const file = bucket.file(storagePath);
    await file.save(fileBuffer, {
        contentType: 'application/pdf',
        metadata: {
            metadata: { resourceId, smokeTest: 'true' },
        },
    });
    const downloadUrl = `gs://${bucketName}/${storagePath}`;
    console.log(`✓ Upload complete`);

    // 4. Create the Firestore doc the cascade reads. Mirrors the
    //    shape produced by `LibraryService.uploadResource`.
    const db = admin.firestore();
    const resourceRef = db.collection('library_resources').doc(resourceId);
    const now = admin.firestore.Timestamp.now();
    await resourceRef.set({
        userId,
        title,
        author,
        type: 'other',
        storageUrl: downloadUrl,
        mimeType: 'application/pdf',
        sizeBytes: fileSizeBytes,
        textExtractionStatus: 'pending',
        textContent: null,
        textContentUrl: null,
        characterCount: null,
        pageCount: null,
        preferredForPhases: [],
        metadata: {},
        coreStores: [],
        requestedExtractionMode: mode,
        createdAt: now,
        updatedAt: now,
    });
    console.log(`✓ Firestore doc created — extraction trigger will fire shortly`);
    console.log('');

    // 5. Watch the resource. Print a status line on every change,
    //    and resolve when it hits a terminal state.
    const startMs = Date.now();
    const result = await new Promise((resolve) => {
        let resolved = false;
        let lastStatusKey = '';

        const finishWith = (verdict) => {
            if (resolved) return;
            resolved = true;
            unsubscribe();
            clearTimeout(timer);
            resolve(verdict);
        };

        const unsubscribe = resourceRef.onSnapshot(
            (snap) => {
                if (!snap.exists) return;
                const data = snap.data();
                const elapsedMs = Date.now() - startMs;
                const key = `${data.textExtractionStatus}|${data.indexingStatus}|${data.extractionVersion}|${data.indexedChunkCount}`;
                if (key !== lastStatusKey) {
                    console.log(statusLine(data, elapsedMs));
                    lastStatusKey = key;
                }

                // Hard failure terminates fast.
                if (data.textExtractionStatus === 'failed') {
                    finishWith({
                        ok: false,
                        reason: 'extraction-failed',
                        data,
                        elapsedMs,
                    });
                    return;
                }
                if (data.indexingStatus === 'failed') {
                    finishWith({
                        ok: false,
                        reason: 'indexing-failed',
                        data,
                        elapsedMs,
                    });
                    return;
                }

                // Success: extraction ready + indexing ready + chunks > 0
                if (
                    data.textExtractionStatus === 'ready'
                    && data.indexingStatus === 'ready'
                    && (data.indexedChunkCount ?? 0) > 0
                ) {
                    finishWith({
                        ok: true,
                        reason: 'indexed',
                        data,
                        elapsedMs,
                    });
                }
            },
            (err) => {
                finishWith({
                    ok: false,
                    reason: 'firestore-listener-error',
                    error: err.message ?? String(err),
                    elapsedMs: Date.now() - startMs,
                });
            },
        );

        const timer = setTimeout(() => {
            finishWith({
                ok: false,
                reason: 'timeout',
                elapsedMs: Date.now() - startMs,
            });
        }, timeoutSeconds * 1000);
    });

    // 6. Report.
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (result.ok) {
        const d = result.data;
        console.log(`✅ PASS — indexed in ${fmtDuration(result.elapsedMs)}`);
        console.log('');
        console.log(`   extractionVersion:  ${d.extractionVersion}`);
        console.log(`   pageCount:          ${d.pageCount}`);
        console.log(`   characterCount:     ${d.characterCount ?? '—'}`);
        console.log(`   indexedChunkCount:  ${d.indexedChunkCount}`);
        console.log(`   indexerVersion:     ${d.indexerVersion ?? '—'}`);
        if (d.extractionWarning) {
            console.log(`   ⚠️  warning:         ${d.extractionWarning}`);
        }
    } else {
        console.log(`❌ FAIL — ${result.reason} after ${fmtDuration(result.elapsedMs)}`);
        console.log('');
        if (result.data) {
            console.log(`   extractionStatus:   ${result.data.textExtractionStatus ?? '—'}`);
            console.log(`   indexingStatus:     ${result.data.indexingStatus ?? '—'}`);
            console.log(`   extractionVersion:  ${result.data.extractionVersion ?? '—'}`);
            if (result.data.extractionError) {
                console.log(`   extractionError:    ${result.data.extractionError}`);
            }
            if (result.data.indexingError) {
                console.log(`   indexingError:      ${result.data.indexingError}`);
            }
        }
        if (result.error) {
            console.log(`   error:              ${result.error}`);
        }
        console.log('');
        console.log(`   Inspect resource:   ${resourceId}`);
        console.log(`   Logs:`);
        console.log(`     gcloud functions logs read extractPdfWithGemini --project=${projectId} --gen2 --region=us-central1 --limit=50`);
        console.log(`     gcloud functions logs read autoIndexOnExtractionReady --project=${projectId} --gen2 --region=us-central1 --limit=50`);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    console.log('');

    // 7a. Refund any pages debited by the cloud function — ALWAYS,
    //     regardless of --keep. Smoke tests are validation, not real
    //     consumption: if you ran this script, the debit was incurred
    //     for verification purposes and shouldn't reduce your real
    //     balance. Mirrors the cloud function's mode mapping:
    //       3.0-llamaparse              → refund Premium
    //       4.0-gemini-standard / 2.0   → refund Standard
    //       5.0-pdfparse-structured     → no refund (was free)
    //     Skip if extraction never produced a version (failed early
    //     before any debit happened).
    const finalData = result.data ?? {};
    const debitedMode = (() => {
        const v = finalData.extractionVersion;
        if (v === '3.0-llamaparse') return 'premium';
        if (v === '4.0-gemini-standard' || v === '2.0-gemini') return 'standard';
        return null; // 5.0-pdfparse-structured + fallback-pdfparse + failed = free
    })();
    const debitedPages = finalData.pageCount ?? 0;
    if (debitedMode && debitedPages > 0) {
        const planField = `plan${debitedMode.charAt(0).toUpperCase()}${debitedMode.slice(1)}Pages`;
        const availField = `${debitedMode}PagesAvailable`;
        const spentField = `${debitedMode}SpentTotal`;
        try {
            await db.collection('users').doc(userId).update({
                [`processingBalance.${planField}`]: admin.firestore.FieldValue.increment(debitedPages),
                [`processingBalance.${availField}`]: admin.firestore.FieldValue.increment(debitedPages),
                [`processingBalance.${spentField}`]: admin.firestore.FieldValue.increment(-debitedPages),
                'processingBalance.updatedAt': admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log(`💳 Refunded ${debitedPages} ${debitedMode} pages to plan bucket`);
        } catch (refundErr) {
            console.log(`⚠️  Refund failed: ${refundErr.message ?? refundErr}`);
            console.log(`   Run manually: node scripts/refund-pages.mjs --user <email> --mode ${debitedMode} --pages ${debitedPages}`);
        }
    }

    // 7b. Cleanup (delete artifacts) unless --keep.
    if (!keepResource) {
        console.log('🧹 Cleaning up...');
        try {
            const chunkSnap = await db
                .collection('document_chunks')
                .where('resourceId', '==', resourceId)
                .get();
            if (!chunkSnap.empty) {
                const batch = db.batch();
                chunkSnap.docs.forEach((d) => batch.delete(d.ref));
                await batch.commit();
                console.log(`   ✓ Deleted ${chunkSnap.size} chunks`);
            }
            try {
                await file.delete();
                console.log(`   ✓ Deleted PDF from storage`);
            } catch (delErr) {
                console.log(`   ⚠️  PDF delete skipped: ${delErr.message ?? delErr}`);
            }
            try {
                const mdFile = bucket.file(`users/${userId}/library/${resourceId}/structured.md`);
                const [exists] = await mdFile.exists();
                if (exists) {
                    await mdFile.delete();
                    console.log(`   ✓ Deleted structured.md`);
                }
            } catch {
                // ignore
            }
            await resourceRef.delete();
            console.log(`   ✓ Deleted Firestore doc`);
        } catch (cleanupErr) {
            console.log(`   ⚠️  Cleanup error: ${cleanupErr.message ?? cleanupErr}`);
            console.log(`   Resource ${resourceId} may need manual cleanup.`);
        }
    } else {
        console.log(`⏭️  --keep set; resource left in your library: ${resourceId}`);
        if (debitedMode && debitedPages > 0) {
            console.log(`   (Pages were refunded — the test artifact is yours for free.)`);
        }
    }

    process.exit(result.ok ? 0 : 1);
}

main().catch((err) => {
    console.error('');
    console.error('💥 Unhandled error:', err.message ?? err);
    if (err.stack) console.error(err.stack);
    process.exit(2);
});
