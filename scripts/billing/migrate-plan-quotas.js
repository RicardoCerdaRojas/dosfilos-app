#!/usr/bin/env node
/**
 * Local equivalent of the `migratePlanQuotas` callable function.
 *
 * Writes the new monthly-quota model to Firestore `plans/{free,basic,pro,team}`:
 *   - `limits.standardPagesPerMonth`
 *   - `limits.premiumPagesPerMonth`
 *   - `limits.pagesProcessedPerMonth` (legacy total, kept for retro-compat)
 *   - `bonusInitial.{standardPages, premiumPages}` (matching monthly quota
 *     so first-cycle activation seeds the user with a full month of pages)
 *
 * Idempotent — uses `set({ merge: true })`, only touches the fields it
 * controls. Re-running is safe.
 *
 * Auth: relies on Application Default Credentials. Run
 *   `gcloud auth application-default login` once if you haven't.
 *
 * Usage:
 *   node scripts/billing/migrate-plan-quotas.js
 *
 * Source of truth for these numbers:
 *   memory/billing_monthly_quota_model.md (decision sealed 2026-05-01)
 */

const admin = require('firebase-admin');

admin.initializeApp({ projectId: 'dosfilosapp' });
const db = admin.firestore();

const QUOTAS = {
    free: {
        libraryDocsLimit: 0,
        standardPagesPerMonth: 0,
        premiumPagesPerMonth: 0,
        pagesProcessedPerMonth: 0,
        queriesPerMonth: 50,
        libraryStorageMB: 0,
        hebrewSessionsPerMonth: 2,
    },
    basic: {
        libraryDocsLimit: 15,
        standardPagesPerMonth: 800,
        premiumPagesPerMonth: 40,
        pagesProcessedPerMonth: 840,
        queriesPerMonth: 500,
        libraryStorageMB: 500,
        hebrewSessionsPerMonth: 5,
    },
    pro: {
        libraryDocsLimit: 50,
        standardPagesPerMonth: 2_500,
        premiumPagesPerMonth: 150,
        pagesProcessedPerMonth: 2_650,
        queriesPerMonth: 2_000,
        libraryStorageMB: 2_000,
        hebrewSessionsPerMonth: -1,
    },
    team: {
        libraryDocsLimit: 200,
        standardPagesPerMonth: 5_000,
        premiumPagesPerMonth: 300,
        pagesProcessedPerMonth: 5_300,
        queriesPerMonth: -1,
        libraryStorageMB: 10_000,
        hebrewSessionsPerMonth: -1,
    },
};

const BONUS = {
    free: { standardPages: 0, premiumPages: 0 },
    basic: { standardPages: 800, premiumPages: 40 },
    pro: { standardPages: 2_500, premiumPages: 150 },
    team: { standardPages: 5_000, premiumPages: 300 },
};

async function migrate() {
    console.log('🔧 Migrating plan quotas to monthly-renewal model...\n');

    const results = [];

    for (const planId of ['free', 'basic', 'pro', 'team']) {
        const ref = db.collection('plans').doc(planId);
        const snap = await ref.get();

        if (!snap.exists) {
            console.log(`⚠️  ${planId}: plan doc not found in Firestore — skipping`);
            results.push({ planId, action: 'skipped', reason: 'plan not found' });
            continue;
        }

        const current = snap.data();
        await ref.set({
            limits: { ...(current?.limits ?? {}), ...QUOTAS[planId] },
            bonusInitial: BONUS[planId],
            updatedAt: new Date(),
        }, { merge: true });

        console.log(`✅ ${planId}:`);
        console.log(`   standardPagesPerMonth: ${QUOTAS[planId].standardPagesPerMonth}`);
        console.log(`   premiumPagesPerMonth:  ${QUOTAS[planId].premiumPagesPerMonth}`);
        console.log(`   bonusInitial:          ${BONUS[planId].standardPages} std + ${BONUS[planId].premiumPages} prem`);
        console.log('');
        results.push({ planId, action: 'updated', quotas: QUOTAS[planId], bonus: BONUS[planId] });
    }

    console.log('🎉 Migration complete. Summary:');
    console.log(JSON.stringify(results, null, 2));
    process.exit(0);
}

migrate().catch(err => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
});
