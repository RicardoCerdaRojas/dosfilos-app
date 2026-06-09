#!/usr/bin/env node
/**
 * Create an "ambassador" account: a comped Pro user (no Stripe) that inherits
 * a deep copy of an existing user's personal library.
 *
 * What it does (in order):
 *   1. Resolves the SOURCE user (the library to clone) by email.
 *   2. Creates/reuses the TARGET Firebase Auth user (no password set).
 *   3. Writes users/{uid} as a comp Pro account (subscription.planId='pro',
 *      status='active', NO stripeCustomerId / subscription.id).
 *   4. Seeds processingBalance plan buckets from plans/pro.limits (+ optional
 *      bonusInitial into the pack buckets), keeping available = plan + pack.
 *   5. Deep-copies the library: for every library_resources doc owned by the
 *      source user it (a) copies the underlying Storage objects into the new
 *      user's path, (b) writes a new library_resources doc with a fresh
 *      resourceId + rewritten storage URLs, (c) copies the document_chunks
 *      (RAG embeddings) remapped to the new userId + resourceId.
 *   6. Prints a password-reset link for the target user to set their password.
 *
 * SAFETY: dry-run by default. Pass --commit to actually mutate anything.
 *
 * Auth: uses Application Default Credentials. Run one of:
 *   gcloud auth application-default login
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json
 *
 * Run:
 *   node scripts/createAmbassadorAccount.mjs            # dry run (no writes)
 *   node scripts/createAmbassadorAccount.mjs --commit   # execute
 */

import admin from 'firebase-admin';
import crypto from 'node:crypto';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const PROJECT_ID = 'dosfilosapp';
const DEFAULT_BUCKET = 'dosfilosapp.firebasestorage.app';

const SOURCE_EMAIL = 'rdocerda@gmail.com';
const TARGET_EMAIL = 'jonathanmurciad@gmail.com';
const TARGET_NAME = 'Jonathan Murcia';
const PLAN_ID = 'pro';
const LOCALE = 'es';

// Credit the plan's bonusInitial into the pack buckets too (parity with a
// real signup). Set false to seed ONLY the monthly plan quota.
const INCLUDE_BONUS_INITIAL = true;

const COMMIT = process.argv.includes('--commit');

// ---------------------------------------------------------------------------
admin.initializeApp({ projectId: PROJECT_ID, storageBucket: DEFAULT_BUCKET });
const db = admin.firestore();
const auth = admin.auth();
const { FieldValue } = admin.firestore;

const log = (...a) => console.log(...a);
const tag = COMMIT ? '' : '[DRY-RUN] ';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Retry a Firestore/Storage op on transient gRPC errors (DEADLINE_EXCEEDED,
 * UNAVAILABLE, ABORTED, INTERNAL). Exponential backoff, up to 5 attempts.
 */
async function withRetry(label, fn) {
    const TRANSIENT = [4 /*DEADLINE*/, 14 /*UNAVAILABLE*/, 10 /*ABORTED*/, 13 /*INTERNAL*/];
    let lastErr;
    for (let attempt = 1; attempt <= 5; attempt++) {
        try {
            return await fn();
        } catch (e) {
            lastErr = e;
            const code = e?.code;
            const transient = TRANSIENT.includes(code) || /DEADLINE_EXCEEDED|UNAVAILABLE|ABORTED/.test(String(e?.message));
            if (!transient || attempt === 5) throw e;
            const backoff = 1000 * 2 ** (attempt - 1);
            log(`      ⟳ ${label} transient error (attempt ${attempt}); retrying in ${backoff}ms`);
            await sleep(backoff);
        }
    }
    throw lastErr;
}

// ---------------------------------------------------------------------------
// Storage URL helpers
// ---------------------------------------------------------------------------

/** Parse { bucket, path } from a gs:// or firebasestorage https download URL. */
function parseStorageUrl(url) {
    if (!url) return null;
    if (url.startsWith('gs://')) {
        const rest = url.slice('gs://'.length);
        const slash = rest.indexOf('/');
        return { bucket: rest.slice(0, slash), path: rest.slice(slash + 1) };
    }
    // https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<ENC-PATH>?...
    const m = url.match(/\/v0\/b\/([^/]+)\/o\/([^?]+)/);
    if (m) return { bucket: m[1], path: decodeURIComponent(m[2]) };
    return null;
}

/** Build a tokenized Firebase download URL for a given object path. */
function buildDownloadUrl(bucket, path, token) {
    return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}

/**
 * Rewrite a storage path from the source user/resource to the target.
 * Replaces the userId segment and the resourceId segment.
 */
function rewritePath(path, srcUid, dstUid, oldRid, newRid) {
    return path
        .replaceAll(`users/${srcUid}/`, `users/${dstUid}/`)
        .replaceAll(`/${oldRid}/`, `/${newRid}/`)
        .replace(new RegExp(`/${oldRid}$`), `/${newRid}`);
}

/**
 * Copy one Storage object to its rewritten destination. For the original-file
 * URL (isDownloadUrl=true) we mint a fresh download token and return a usable
 * https URL; for gs:// derived files we return a gs:// URL.
 */
async function copyObject({ url, srcUid, dstUid, oldRid, newRid, isDownloadUrl }) {
    const parsed = parseStorageUrl(url);
    if (!parsed) {
        log(`      ! could not parse storage url, leaving as-is: ${url}`);
        return url;
    }
    const { bucket: bucketName, path: srcPath } = parsed;
    const dstPath = rewritePath(srcPath, srcUid, dstUid, oldRid, newRid);

    if (dstPath === srcPath) {
        log(`      ! rewrite produced identical path (${srcPath}); leaving url as-is`);
        return url;
    }

    const bucket = admin.storage().bucket(bucketName);
    const srcFile = bucket.file(srcPath);
    const [exists] = await withRetry('storage.exists', () => srcFile.exists()).then((r) => r);
    if (!exists) {
        log(`      ! source object missing in Storage: ${srcPath} (skipping copy, keeping original url)`);
        return url;
    }

    if (!COMMIT) {
        log(`      ${tag}copy gs://${bucketName}/${srcPath} -> ${dstPath}`);
        return isDownloadUrl ? buildDownloadUrl(bucketName, dstPath, '<new-token>') : `gs://${bucketName}/${dstPath}`;
    }

    const dstFile = bucket.file(dstPath);
    await withRetry('storage.copy', () => srcFile.copy(dstFile));

    if (isDownloadUrl) {
        const token = crypto.randomUUID();
        await withRetry('storage.setMetadata', () => dstFile.setMetadata({ metadata: { firebaseStorageDownloadTokens: token } }));
        return buildDownloadUrl(bucketName, dstPath, token);
    }
    return `gs://${bucketName}/${dstPath}`;
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

async function resolveSourceUid() {
    const u = await auth.getUserByEmail(SOURCE_EMAIL);
    log(`Source user: ${SOURCE_EMAIL} -> ${u.uid}`);
    return u.uid;
}

async function ensureTargetUser() {
    try {
        const existing = await auth.getUserByEmail(TARGET_EMAIL);
        log(`Target user already exists: ${TARGET_EMAIL} -> ${existing.uid} (reusing)`);
        return existing.uid;
    } catch (e) {
        if (e.code !== 'auth/user-not-found') throw e;
    }
    if (!COMMIT) {
        log(`${tag}create Auth user ${TARGET_EMAIL} ("${TARGET_NAME}")`);
        return '<new-target-uid>';
    }
    const created = await auth.createUser({
        email: TARGET_EMAIL,
        displayName: TARGET_NAME,
        emailVerified: true,
    });
    log(`Created Auth user: ${TARGET_EMAIL} -> ${created.uid}`);
    return created.uid;
}

async function writeUserProfileAndPlan(targetUid) {
    const planSnap = await db.collection('plans').doc(PLAN_ID).get();
    if (!planSnap.exists) throw new Error(`plans/${PLAN_ID} not found`);
    const plan = planSnap.data();
    const limits = plan.limits ?? {};
    const bonus = plan.bonusInitial ?? {};

    const planStandard = Math.max(0, Number(limits.standardPagesPerMonth) || 0);
    const planPremium = Math.max(0, Number(limits.premiumPagesPerMonth) || 0);
    const planExegesis = Math.max(0, Number(limits.exegesisUsdPerMonth) || 0);
    const packStandard = INCLUDE_BONUS_INITIAL ? Math.max(0, Number(bonus.standardPages) || 0) : 0;
    const packPremium = INCLUDE_BONUS_INITIAL ? Math.max(0, Number(bonus.premiumPages) || 0) : 0;

    // Comp subscription: paid plan, NO Stripe. ~10 years out so nothing in the
    // UI treats it as expiring.
    const farFuture = new Date('2036-01-01T00:00:00Z');

    const profile = {
        email: TARGET_EMAIL,
        displayName: TARGET_NAME,
        locale: LOCALE,
        preferredLanguage: LOCALE,
        role: 'user',
        status: 'active',
        onboardingCompleted: false,
        subscription: {
            planId: PLAN_ID,
            status: 'active',
            currentPeriodEnd: farFuture,
            cancelAtPeriodEnd: false,
        },
        processingBalance: {
            planStandardPages: planStandard,
            planPremiumPages: planPremium,
            planExegesisUsd: planExegesis,
            packStandardPages: packStandard,
            packPremiumPages: packPremium,
            packExegesisUsd: 0,
            standardPagesAvailable: planStandard + packStandard,
            premiumPagesAvailable: planPremium + packPremium,
            exegesisUsdAvailable: planExegesis,
            standardSpentTotal: 0,
            premiumSpentTotal: 0,
            exegesisSpentTotalUsd: 0,
            updatedAt: FieldValue.serverTimestamp(),
        },
        settings: {
            language: LOCALE,
            notifications: { email: true, trialReminders: true },
        },
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    };

    log(`${tag}write users/${targetUid} as comp ${PLAN_ID.toUpperCase()} (no Stripe)`);
    log(`        plan quota:  std=${planStandard} prem=${planPremium} exeg=$${planExegesis}`);
    log(`        pack bonus:  std=${packStandard} prem=${packPremium}`);

    if (COMMIT) {
        // merge:true so re-running doesn't clobber an existing profile wholesale.
        await db.collection('users').doc(targetUid).set(profile, { merge: true });
    }
}

async function cloneLibrary(srcUid, dstUid) {
    // Idempotency guard: don't double-clone. Re-running with --commit would mint
    // fresh resourceIds and leave the target with two copies of every book.
    const existingTarget = await db
        .collection('library_resources')
        .where('userId', '==', dstUid)
        .limit(1)
        .get();
    if (!existingTarget.empty) {
        log(`\n⚠️  Target user already owns library resources — skipping clone to avoid duplicates.`);
        log(`    (delete them first if you want to re-clone, or this run only refreshed the profile/plan.)`);
        return;
    }

    const snap = await db.collection('library_resources').where('userId', '==', srcUid).get();
    log(`\nLibrary: ${snap.size} resource(s) owned by source user.`);

    let copied = 0;
    let chunkTotal = 0;
    let skippedSystem = 0;
    let skippedCore = 0;
    let skippedDupe = 0;
    const seen = new Set(); // title|author keys, to dedupe personal library

    for (const doc of snap.docs) {
        const data = doc.data();
        // Never clone shared sources: system sources OR Core Library docs
        // (curated, owned by the admin but flagged with coreStores — the
        // target already sees those through the product's Core Library).
        if (data.isSystemSource || data.userId === '__system__') { skippedSystem++; continue; }
        if (Array.isArray(data.coreStores) && data.coreStores.length > 0) { skippedCore++; continue; }

        // Dedupe by title+author within the personal library.
        const dedupeKey = `${(data.title || '').trim().toLowerCase()}|${(data.author || '').trim().toLowerCase()}`;
        if (seen.has(dedupeKey)) { skippedDupe++; log(`  ⏭  dupe skipped: "${data.title}"`); continue; }
        seen.add(dedupeKey);

        const oldRid = doc.id;
        const newRid = crypto.randomUUID();
        log(`  • "${data.title ?? '(untitled)'}" ${oldRid} -> ${newRid}`);

        // 1. Copy storage objects + rewrite the three URL fields.
        const newStorageUrl = data.storageUrl
            ? await copyObject({ url: data.storageUrl, srcUid, dstUid, oldRid, newRid, isDownloadUrl: true })
            : data.storageUrl;
        const newStructuredUrl = data.structuredContentUrl
            ? await copyObject({ url: data.structuredContentUrl, srcUid, dstUid, oldRid, newRid, isDownloadUrl: false })
            : data.structuredContentUrl;
        const newTextUrl = data.textContentUrl
            ? await copyObject({ url: data.textContentUrl, srcUid, dstUid, oldRid, newRid, isDownloadUrl: false })
            : data.textContentUrl;

        // 2. New library_resources doc.
        const newResource = {
            ...data,
            id: newRid,
            userId: dstUid,
            ...(newStorageUrl !== undefined ? { storageUrl: newStorageUrl } : {}),
            ...(newStructuredUrl !== undefined ? { structuredContentUrl: newStructuredUrl } : {}),
            ...(newTextUrl !== undefined ? { textContentUrl: newTextUrl } : {}),
            clonedFromResourceId: oldRid, // provenance / resume marker
            createdAt: COMMIT ? FieldValue.serverTimestamp() : data.createdAt,
            updatedAt: COMMIT ? FieldValue.serverTimestamp() : data.updatedAt,
        };
        if (COMMIT) await withRetry('resource.set', () => db.collection('library_resources').doc(newRid).set(newResource));

        // 3. Copy RAG chunks (document_chunks) remapped to new uid + resourceId.
        const chunksSnap = await withRetry('chunks.query', () => db
            .collection('document_chunks')
            .where('userId', '==', srcUid)
            .where('resourceId', '==', oldRid)
            .get());

        log(`      chunks: ${chunksSnap.size}`);
        chunkTotal += chunksSnap.size;

        if (COMMIT && chunksSnap.size > 0) {
            let batch = db.batch();
            let n = 0;
            for (const ch of chunksSnap.docs) {
                const newChunkId = ch.id.startsWith(`${oldRid}_chunk_`)
                    ? ch.id.replace(`${oldRid}_chunk_`, `${newRid}_chunk_`)
                    : `${newRid}_chunk_${n}`;
                batch.set(db.collection('document_chunks').doc(newChunkId), {
                    ...ch.data(),
                    userId: dstUid,
                    resourceId: newRid,
                });
                // Chunks carry embedding vectors (~10-25KB each), so the
                // ~10MB Firestore transaction cap binds well before the
                // 500-op cap. Commit every 50 to stay clear of it.
                if (++n % 50 === 0) { const b = batch; await withRetry('chunks.commit', () => b.commit()); batch = db.batch(); }
            }
            await withRetry('chunks.commit', () => batch.commit());
        }
        copied++;
    }

    log(`\nLibrary clone summary: ${copied} resource(s), ${chunkTotal} chunk(s) ${COMMIT ? 'copied' : 'would copy'}.`);
    log(`  skipped — system: ${skippedSystem}, core: ${skippedCore}, dupes: ${skippedDupe}`);
}

async function printResetLink() {
    if (!COMMIT) {
        log(`${tag}generate password-reset link for ${TARGET_EMAIL}`);
        return;
    }
    const link = await auth.generatePasswordResetLink(TARGET_EMAIL);
    log(`\n🔑 Password-reset link for ${TARGET_EMAIL}:\n${link}\n   (send this to Jonathan so he can set his password)`);
}

// ---------------------------------------------------------------------------
async function main() {
    log(`\n=== Ambassador account setup ${COMMIT ? '(COMMIT)' : '(DRY RUN — no writes)'} ===\n`);
    const srcUid = await resolveSourceUid();
    const dstUid = await ensureTargetUser();
    await writeUserProfileAndPlan(dstUid);
    await cloneLibrary(srcUid, dstUid);
    await printResetLink();
    log(`\n✅ Done${COMMIT ? '' : ' (dry run — re-run with --commit to apply)'}.\n`);
    process.exit(0);
}

main().catch((e) => {
    console.error('\n❌ Failed:', e);
    process.exit(1);
});
