#!/usr/bin/env node
/**
 * Restore a comp account's processingBalance to its intended plan values.
 * Needed because cloning the library (copying PDFs into users/{uid}/library/)
 * fires the extractPdfWithGemini storage trigger, which re-extracts every book
 * in premium mode and debits premium pages — draining the quota into negative.
 *
 * This re-seeds plan+pack buckets from plans/{planId}.limits + bonusInitial and
 * zeroes the spent counters. It does NOT grant extra beyond the intended comp
 * Pro quota.
 *
 * Run: node scripts/_resetAmbassadorBalance.mjs <targetUid> [--commit]
 */
import admin from 'firebase-admin';

const TARGET = process.argv[2];
const COMMIT = process.argv.includes('--commit');
const PLAN_ID = 'pro';
const INCLUDE_BONUS = true;
if (!TARGET) { console.error('usage: node _resetAmbassadorBalance.mjs <targetUid> [--commit]'); process.exit(1); }

admin.initializeApp({ projectId: 'dosfilosapp' });
const db = admin.firestore();
const { FieldValue } = admin.firestore;

(async () => {
    const plan = (await db.collection('plans').doc(PLAN_ID).get()).data();
    const limits = plan.limits ?? {};
    const bonus = plan.bonusInitial ?? {};
    const planStd = Math.max(0, Number(limits.standardPagesPerMonth) || 0);
    const planPrem = Math.max(0, Number(limits.premiumPagesPerMonth) || 0);
    const planExeg = Math.max(0, Number(limits.exegesisUsdPerMonth) || 0);
    const packStd = INCLUDE_BONUS ? Math.max(0, Number(bonus.standardPages) || 0) : 0;
    const packPrem = INCLUDE_BONUS ? Math.max(0, Number(bonus.premiumPages) || 0) : 0;

    const ref = db.collection('users').doc(TARGET);
    const before = (await ref.get()).data().processingBalance;
    console.log('BEFORE:', JSON.stringify({
        stdAvail: before.standardPagesAvailable, premAvail: before.premiumPagesAvailable,
        premSpent: before.premiumSpentTotal, exegAvail: before.exegesisUsdAvailable,
    }));

    const next = {
        'processingBalance.planStandardPages': planStd,
        'processingBalance.planPremiumPages': planPrem,
        'processingBalance.planExegesisUsd': planExeg,
        'processingBalance.packStandardPages': packStd,
        'processingBalance.packPremiumPages': packPrem,
        'processingBalance.packExegesisUsd': 0,
        'processingBalance.standardPagesAvailable': planStd + packStd,
        'processingBalance.premiumPagesAvailable': planPrem + packPrem,
        'processingBalance.exegesisUsdAvailable': planExeg,
        'processingBalance.standardSpentTotal': 0,
        'processingBalance.premiumSpentTotal': 0,
        'processingBalance.exegesisSpentTotalUsd': 0,
        'processingBalance.updatedAt': FieldValue.serverTimestamp(),
    };
    console.log('TARGET:', JSON.stringify({ stdAvail: planStd + packStd, premAvail: planPrem + packPrem, exegAvail: planExeg }));

    if (COMMIT) { await ref.update(next); console.log('✅ balance reset applied.'); }
    else console.log('[DRY] not applied. Re-run with --commit.');
    process.exit(0);
})().catch(e => { console.error('FAILED', e); process.exit(1); });
