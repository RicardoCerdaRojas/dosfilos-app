#!/usr/bin/env node
/**
 * Adds the `exegesis:studies` feature code to `plans/pro.features` and
 * `plans/team.features` so the public pricing surfaces render the new
 * exégesis module on those tiers. Free / Personal stay untouched —
 * those plans gate exégesis behind an upgrade modal.
 *
 * Idempotent: skips if the feature is already present.
 *
 * Usage:
 *   node scripts/billing/add-exegesis-feature-to-plans.js
 *
 * Auth: ADC. Run `gcloud auth application-default login` first.
 */

const admin = require('firebase-admin');

admin.initializeApp({ projectId: 'dosfilosapp' });
const db = admin.firestore();

const PLAN_IDS = ['pro', 'team'];
const FEATURE_CODE = 'exegesis:studies';

async function run() {
    console.log(`🔧 Adding "${FEATURE_CODE}" to plans: ${PLAN_IDS.join(', ')}\n`);

    const results = [];
    for (const planId of PLAN_IDS) {
        const ref = db.collection('plans').doc(planId);
        const snap = await ref.get();
        if (!snap.exists) {
            console.log(`⚠️  ${planId}: plan doc not found — skipping`);
            results.push({ planId, action: 'skipped', reason: 'plan not found' });
            continue;
        }

        const features = Array.isArray(snap.data().features) ? snap.data().features : [];
        if (features.includes(FEATURE_CODE)) {
            console.log(`✓ ${planId}: feature already present — skipping`);
            results.push({ planId, action: 'skipped', reason: 'already present' });
            continue;
        }

        await ref.update({
            features: admin.firestore.FieldValue.arrayUnion(FEATURE_CODE),
            updatedAt: new Date(),
        });
        console.log(`✅ ${planId}: feature added`);
        results.push({ planId, action: 'updated' });
    }

    console.log('\n🎉 Done. Summary:');
    console.log(JSON.stringify(results, null, 2));
    process.exit(0);
}

run().catch(err => {
    console.error('❌ Failed:', err);
    process.exit(1);
});
