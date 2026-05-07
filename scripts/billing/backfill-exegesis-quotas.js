#!/usr/bin/env node
/**
 * Local-runner sister of the `backfillExegesisQuotas` callable.
 * Same logic, but invoked via Admin SDK + ADC — no Firebase callable
 * auth needed (the callable enforces super-admin email; this script
 * relies on whoever runs it having `gcloud auth application-default
 * login`'d as a Firestore-write-enabled identity).
 *
 * Walks `users/`, seeds `processingBalance.planExegesisUsd` from
 * `plans/{id}.limits.exegesisUsdPerMonth` for active paid subscribers
 * (Pro/Team only — Free/Personal stay gated). Idempotent via
 * `users/{uid}/monthly_grants/exegesis-backfill-{ts}` markers.
 *
 * Usage:
 *   node scripts/billing/backfill-exegesis-quotas.js --dry-run     # preview
 *   node scripts/billing/backfill-exegesis-quotas.js               # commit
 *
 * Auth: ADC. Run `gcloud auth application-default login` first.
 *
 * Spec: docs/EXEGESIS_PRICING_INTEGRATION.md §9 / Fase 6.
 */

const admin = require('firebase-admin');

admin.initializeApp({ projectId: 'dosfilosapp' });
const db = admin.firestore();

const dryRun = process.argv.includes('--dry-run');
const ts = Date.now();
const markerId = `exegesis-backfill-${ts}`;

async function readExegesisBucket(userId) {
    const snap = await db.collection('users').doc(userId).get();
    const balance = snap.exists ? (snap.data().processingBalance ?? {}) : {};
    return {
        planExegesisUsd: Number(balance.planExegesisUsd) || 0,
        packExegesisUsd: Number(balance.packExegesisUsd) || 0,
        exegesisUsdAvailable: Number(balance.exegesisUsdAvailable) || 0,
        exegesisSpentTotalUsd: Number(balance.exegesisSpentTotalUsd) || 0,
    };
}

async function setExegesisPlanQuota(userId, usdAmount) {
    const ref = db.collection('users').doc(userId);
    const snap = await ref.get();
    const bucket = await readExegesisBucket(userId);
    const newPlan = Math.max(0, usdAmount);

    if (!snap.exists || !snap.data()?.processingBalance) {
        await ref.set(
            { processingBalance: {} },
            { merge: true },
        );
    }

    await ref.update({
        'processingBalance.planExegesisUsd': newPlan,
        'processingBalance.exegesisUsdAvailable': newPlan + bucket.packExegesisUsd,
        'processingBalance.updatedAt': admin.firestore.FieldValue.serverTimestamp(),
    });
}

async function backfill() {
    console.log(`🔧 Exegesis quota backfill (dryRun=${dryRun}, markerId=${markerId})...\n`);

    const planSnap = await db.collection('plans').get();
    const planAllowances = new Map();
    planSnap.docs.forEach(doc => {
        const limits = doc.data().limits ?? {};
        planAllowances.set(doc.id, Math.max(0, Number(limits.exegesisUsdPerMonth) || 0));
    });
    console.log('Plan allowances loaded:', Object.fromEntries(planAllowances));

    const usersSnap = await db.collection('users').get();
    const summary = {
        scanned: 0,
        credited: 0,
        skippedNoSubscription: 0,
        skippedFreeOrInactive: 0,
        skippedNoAllowance: 0,
        skippedAlreadyMarked: 0,
        errors: [],
        grantsByPlan: {},
    };

    for (const userDoc of usersSnap.docs) {
        summary.scanned++;
        const data = userDoc.data();
        const subscription = data.subscription;
        if (!subscription) {
            summary.skippedNoSubscription++;
            continue;
        }
        const planId = subscription.planId;
        const status = subscription.status;
        if (!planId || planId === 'free' || (status && status !== 'active' && status !== 'trialing')) {
            summary.skippedFreeOrInactive++;
            continue;
        }
        const allowanceUsd = planAllowances.get(planId);
        if (!allowanceUsd || allowanceUsd <= 0) {
            summary.skippedNoAllowance++;
            continue;
        }

        const grantRef = userDoc.ref.collection('monthly_grants').doc(markerId);
        const existing = await grantRef.get();
        if (existing.exists) {
            summary.skippedAlreadyMarked++;
            continue;
        }

        if (dryRun) {
            summary.credited++;
            summary.grantsByPlan[planId] = (summary.grantsByPlan[planId] ?? 0) + 1;
            continue;
        }

        try {
            await setExegesisPlanQuota(userDoc.id, allowanceUsd);
            await grantRef.set({
                invoiceId: markerId,
                planId,
                exegesisUsdQuota: allowanceUsd,
                billingReason: 'admin-backfill-exegesis',
                grantedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            summary.credited++;
            summary.grantsByPlan[planId] = (summary.grantsByPlan[planId] ?? 0) + 1;
        } catch (err) {
            summary.errors.push({
                userId: userDoc.id,
                reason: err?.message ?? String(err),
            });
        }
    }

    console.log('\n🎉 Backfill complete. Summary:');
    console.log(JSON.stringify(summary, null, 2));
    process.exit(0);
}

backfill().catch(err => {
    console.error('❌ Backfill failed:', err);
    process.exit(1);
});
