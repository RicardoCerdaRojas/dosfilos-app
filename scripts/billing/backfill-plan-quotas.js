#!/usr/bin/env node
/**
 * Local equivalent of the `backfillPlanQuotas` callable function.
 *
 * Walks `users` collection, finds active paid subscriptions, and seeds
 * each user's `processingBalance.plan{Standard,Premium}Pages` bucket
 * with the plan's monthly quota — the same SET semantics the Stripe
 * `invoice.payment_succeeded` webhook uses on each renewal.
 *
 * Pack pages (`pack*` buckets) are NOT touched. Pre-existing balance
 * from prior pack purchases is preserved.
 *
 * Idempotent via marker docs at `users/{uid}/monthly_grants/{markerId}`
 * with prefix `backfill-{timestamp}`. Re-running with the SAME timestamp
 * is a no-op; running again with a fresh timestamp re-credits.
 *
 * Auth: Application Default Credentials. Run
 *   `gcloud auth application-default login` once.
 *
 * Usage:
 *   node scripts/billing/backfill-plan-quotas.js              # dry-run
 *   node scripts/billing/backfill-plan-quotas.js --apply      # write
 */

const admin = require('firebase-admin');
const { FieldValue } = require('firebase-admin/firestore');

admin.initializeApp({ projectId: 'dosfilosapp' });
const db = admin.firestore();

const ZERO_BUCKETS = {
    planStandardPages: 0,
    planPremiumPages: 0,
    packStandardPages: 0,
    packPremiumPages: 0,
    standardPagesAvailable: 0,
    premiumPagesAvailable: 0,
    standardSpentTotal: 0,
    premiumSpentTotal: 0,
};

const dryRun = !process.argv.includes('--apply');

/**
 * Mirror of `setPlanQuotaAdmin` from
 * `packages/functions/src/library/processingBalance.ts`. Kept here as
 * standalone JS so the script doesn't need a TS toolchain.
 *
 * Reads current balance, SETs the requested plan bucket to the given
 * value, recomputes the legacy `*PagesAvailable` aggregate. Pack pages
 * are untouched.
 */
async function setPlanQuota(userId, mode, pages) {
    const ref = db.collection('users').doc(userId);
    const snap = await ref.get();
    const balance = snap.data()?.processingBalance;
    const newPlan = Math.max(0, pages);
    const planStandard = mode === 'standard' ? newPlan : (balance?.planStandardPages ?? 0);
    const planPremium = mode === 'premium' ? newPlan : (balance?.planPremiumPages ?? 0);
    const packStandard = balance?.packStandardPages ?? balance?.standardPagesAvailable ?? 0;
    const packPremium = balance?.packPremiumPages ?? balance?.premiumPagesAvailable ?? 0;

    // Only seed the zero-bucket structure when the balance doesn't exist
    // yet. Doing this unconditionally with `set merge: true` overwrote
    // the leaf values back to 0 between successive calls — the first
    // setPlanQuota('standard', 5000) wrote 5000, then the second call's
    // pre-ensure ZEROed it back before writing premium.
    if (!balance) {
        await ref.set(
            { processingBalance: { ...ZERO_BUCKETS } },
            { merge: true },
        );
    }

    const planField = mode === 'standard'
        ? 'processingBalance.planStandardPages'
        : 'processingBalance.planPremiumPages';
    const availableField = mode === 'standard'
        ? 'processingBalance.standardPagesAvailable'
        : 'processingBalance.premiumPagesAvailable';
    const newAvailable = mode === 'standard'
        ? planStandard + packStandard
        : planPremium + packPremium;

    await ref.update({
        [planField]: newPlan,
        [availableField]: newAvailable,
        'processingBalance.updatedAt': FieldValue.serverTimestamp(),
    });
}

async function backfill() {
    console.log(`🔧 Backfilling plan quotas (mode: ${dryRun ? 'DRY-RUN' : 'APPLY'})...\n`);

    const ts = Date.now();
    const markerId = `backfill-${ts}`;

    // Cache plan limits (small collection, one snapshot is enough).
    const planSnap = await db.collection('plans').get();
    const planLimits = new Map();
    planSnap.docs.forEach(doc => {
        const limits = doc.data().limits ?? {};
        planLimits.set(doc.id, {
            standard: Math.max(0, Number(limits.standardPagesPerMonth) || 0),
            premium: Math.max(0, Number(limits.premiumPagesPerMonth) || 0),
        });
    });
    console.log(`📋 Plan quotas loaded:`);
    for (const [id, q] of planLimits) {
        console.log(`   ${id}: ${q.standard} std / ${q.premium} prem`);
    }
    console.log('');

    const usersSnap = await db.collection('users').get();
    const summary = {
        scanned: 0,
        credited: 0,
        skippedNoSubscription: 0,
        skippedFreeOrInactive: 0,
        skippedNoQuota: 0,
        errors: [],
        grantsByPlan: {},
        creditedUsers: [],
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
        const limits = planLimits.get(planId);
        if (!limits || (limits.standard === 0 && limits.premium === 0)) {
            summary.skippedNoQuota++;
            continue;
        }

        if (dryRun) {
            summary.credited++;
            summary.grantsByPlan[planId] = (summary.grantsByPlan[planId] ?? 0) + 1;
            summary.creditedUsers.push({
                uid: userDoc.id,
                email: data.email ?? '(no email)',
                planId,
                grant: { standard: limits.standard, premium: limits.premium },
            });
            continue;
        }

        try {
            await setPlanQuota(userDoc.id, 'standard', limits.standard);
            await setPlanQuota(userDoc.id, 'premium', limits.premium);
            await userDoc.ref.collection('monthly_grants').doc(markerId).set({
                invoiceId: markerId,
                planId,
                standardQuota: limits.standard,
                premiumQuota: limits.premium,
                billingReason: 'admin-backfill',
                grantedAt: FieldValue.serverTimestamp(),
            });
            summary.credited++;
            summary.grantsByPlan[planId] = (summary.grantsByPlan[planId] ?? 0) + 1;
            summary.creditedUsers.push({
                uid: userDoc.id,
                email: data.email ?? '(no email)',
                planId,
                grant: { standard: limits.standard, premium: limits.premium },
            });
            console.log(`✅ ${data.email ?? userDoc.id} (${planId}): +${limits.standard} std / +${limits.premium} prem`);
        } catch (err) {
            summary.errors.push({
                userId: userDoc.id,
                email: data.email ?? '(no email)',
                reason: err?.message ?? String(err),
            });
            console.error(`❌ ${data.email ?? userDoc.id}: ${err?.message ?? err}`);
        }
    }

    console.log('');
    console.log('🎉 Backfill complete. Summary:');
    console.log(JSON.stringify({
        mode: dryRun ? 'DRY-RUN' : 'APPLY',
        markerId,
        scanned: summary.scanned,
        credited: summary.credited,
        skippedNoSubscription: summary.skippedNoSubscription,
        skippedFreeOrInactive: summary.skippedFreeOrInactive,
        skippedNoQuota: summary.skippedNoQuota,
        errorCount: summary.errors.length,
        grantsByPlan: summary.grantsByPlan,
    }, null, 2));

    if (dryRun) {
        console.log('\n💡 Dry-run only. Re-run with --apply to write the grants.');
        if (summary.creditedUsers.length > 0) {
            console.log('\n👥 Users that would be credited:');
            summary.creditedUsers.slice(0, 20).forEach(u => {
                console.log(`   ${u.email} (${u.planId}): +${u.grant.standard} std / +${u.grant.premium} prem`);
            });
            if (summary.creditedUsers.length > 20) {
                console.log(`   …and ${summary.creditedUsers.length - 20} more`);
            }
        }
    }

    if (summary.errors.length > 0) {
        console.log('\n⚠️  Errors:');
        summary.errors.forEach(e => console.log(`   ${e.email}: ${e.reason}`));
    }

    process.exit(0);
}

backfill().catch(err => {
    console.error('❌ Backfill failed:', err);
    process.exit(1);
});
