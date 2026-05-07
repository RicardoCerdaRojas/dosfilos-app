#!/usr/bin/env node
/**
 * Sister of `migrate-plan-quotas.js` for the EXEGESIS_PRICING_INTEGRATION
 * roadmap (Fase 3). Writes the per-plan exégesis USD allowance to
 * Firestore `plans/{free,basic,pro,team}.limits.exegesisUsdPerMonth`.
 *
 *   free  → $0 (display: "Free")     — module gated.
 *   basic → $0 (display: "Personal") — module gated, upgrade modal in UI.
 *   pro   → $10 (display: "Pro")     — ~5 estudios at STUDY_UNIT_USD = $2.
 *   team  → $30 (display: "Equipo")  — ~15 estudios.
 *
 * IDs are LEGACY (Hito 4 kept the document keys; only display labels
 * changed). See `packages/domain/src/config/planIds.ts`.
 *
 * Idempotent (uses `set merge: true`). Re-running is safe.
 *
 * Auth: relies on Application Default Credentials. Run
 *   `gcloud auth application-default login` once if you haven't.
 *
 * Usage:
 *   node scripts/billing/migrate-exegesis-plan-quotas.js
 *
 * Source of truth: docs/EXEGESIS_PRICING_INTEGRATION.md §3.4 (locked).
 */

const admin = require('firebase-admin');

admin.initializeApp({ projectId: 'dosfilosapp' });
const db = admin.firestore();

const EXEGESIS_QUOTAS = {
    // USD per month. Maps to ~estudios via STUDY_UNIT_USD = $2 in domain.
    // Plan IDs are LEGACY — basic == "Personal" in display.
    free: 0,
    basic: 0,   // display: Personal — gated, upgrade required
    pro: 10,    // ~5 estudios
    team: 30,   // ~15 estudios — display: Equipo
};

const EXEGESIS_BONUS = {
    // One-shot bonus on first activation. Currently 0 across the board
    // (recurring monthly allowance covers usage); reserved for future
    // experiments.
    free: 0,
    basic: 0,
    pro: 0,
    team: 0,
};

async function migrate() {
    console.log('🔧 Migrating exégesis plan allowances...\n');

    const results = [];
    for (const planId of Object.keys(EXEGESIS_QUOTAS)) {
        const ref = db.collection('plans').doc(planId);
        const snap = await ref.get();

        if (!snap.exists) {
            console.log(`⚠️  ${planId}: plan doc not found — skipping`);
            results.push({ planId, action: 'skipped', reason: 'plan not found' });
            continue;
        }

        const current = snap.data();
        await ref.set({
            limits: {
                ...(current?.limits ?? {}),
                exegesisUsdPerMonth: EXEGESIS_QUOTAS[planId],
            },
            bonusInitial: {
                ...(current?.bonusInitial ?? {}),
                exegesisUsd: EXEGESIS_BONUS[planId],
            },
            updatedAt: new Date(),
        }, { merge: true });

        console.log(`✅ ${planId}: exegesisUsdPerMonth = $${EXEGESIS_QUOTAS[planId]} · bonusInitial.exegesisUsd = $${EXEGESIS_BONUS[planId]}`);
        results.push({
            planId,
            action: 'updated',
            exegesisUsdPerMonth: EXEGESIS_QUOTAS[planId],
            exegesisBonusUsd: EXEGESIS_BONUS[planId],
        });
    }

    console.log('\n🎉 Migration complete. Summary:');
    console.log(JSON.stringify(results, null, 2));
    process.exit(0);
}

migrate().catch(err => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
});
