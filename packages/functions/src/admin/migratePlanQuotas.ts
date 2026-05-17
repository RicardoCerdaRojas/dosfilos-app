import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { appCheckCallableOptions } from '../config/appCheckOptions';

/**
 * One-shot migration: upserts plan quota fields into Firestore plan docs.
 *
 * Originally only basic/pro/team because Free was supposed to disappear in
 * favor of a Stripe trial flow. We later kept Free as a feature-limited
 * sampling tier, and the Free plan doc was missing most of the new quota
 * fields — the dashboard rendered "Sin límite definido" for them. This
 * function now seeds Free too, alongside the paid tiers, and includes
 * `hebrewSessionsPerMonth` (entry-tier hook) which the original migration
 * had skipped.
 *
 * Idempotent — `set({...}, { merge: true })` only adds/overrides the fields
 * we control, leaving pricing, modules, etc. intact.
 *
 * Trigger via Firebase Console → Functions → migratePlanQuotas → Test with body {}.
 */
export const migratePlanQuotas = onCall(
    {
        ...appCheckCallableOptions(),
        region: 'us-central1',
        memory: '256MiB',
        timeoutSeconds: 60,
        cors: true,
    },
    async (request) => {
        if (!request.auth || request.auth.token?.email !== 'rdocerda@gmail.com') {
            throw new HttpsError('permission-denied', 'Only admin can run migrations');
        }

        const db = getFirestore();

        // Target quotas — 4-plan model with separated standard/premium pages
        // (see plan-quota redesign session). Calibrated so that "typical
        // active user" sits comfortably inside the plan and "power user"
        // becomes a natural credit-pack buyer.
        //
        //   Tier   | Docs | Std/mes | Prem/mes | Queries/mes | Storage  | Hebrew/mes
        //   -------|------|---------|----------|-------------|----------|-----------
        //   Free   |    0 |       0 |        0 |          50 |     0 MB |          2
        //   Basic  |   15 |     800 |       40 |         500 |   500 MB |          5
        //   Pro    |   50 |   2,500 |      150 |       2,000 |  2000 MB |         -1
        //   Team   |  200 |   5,000 |      300 |          -1 | 10000 MB |         -1
        //
        // `pagesProcessedPerMonth` (legacy, deprecated) is set to the sum
        // standard+premium so any pre-refactor reader keeps seeing a
        // sensible aggregate.
        //
        // `bonusInitial` matches the monthly quota — the user's first
        // billing cycle activates with the same allotment they'll get
        // every month after (no "trial-only generous bonus" trick).
        const quotasByPlanId: Record<string, {
            libraryDocsLimit: number;
            standardPagesPerMonth: number;
            premiumPagesPerMonth: number;
            pagesProcessedPerMonth: number;
            queriesPerMonth: number;
            libraryStorageMB: number;
            hebrewSessionsPerMonth: number;
        }> = {
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
                queriesPerMonth: -1,  // Unlimited
                libraryStorageMB: 10_000,
                hebrewSessionsPerMonth: -1,
            },
        };

        // Mirror of the monthly quotas — credited as the bonus inicial when
        // a subscription activates, so the user can extract on day 1 instead
        // of waiting until the next billing cycle.
        const bonusByPlanId: Record<string, { standardPages: number; premiumPages: number }> = {
            free: { standardPages: 0, premiumPages: 0 },
            basic: { standardPages: 800, premiumPages: 40 },
            pro: { standardPages: 2_500, premiumPages: 150 },
            team: { standardPages: 5_000, premiumPages: 300 },
        };

        const results: Array<{ planId: string; action: 'updated' | 'created' | 'skipped'; details?: any }> = [];

        for (const planId of ['free', 'basic', 'pro', 'team'] as const) {
            const ref = db.collection('plans').doc(planId);
            const snap = await ref.get();
            if (!snap.exists) {
                results.push({ planId, action: 'skipped', details: 'plan not found in Firestore' });
                continue;
            }
            const current = snap.data();
            await ref.set({
                limits: { ...(current?.limits ?? {}), ...quotasByPlanId[planId] },
                bonusInitial: bonusByPlanId[planId],
                updatedAt: new Date(),
            }, { merge: true });
            results.push({
                planId,
                action: 'updated',
                details: {
                    quotas: quotasByPlanId[planId],
                    bonusInitial: bonusByPlanId[planId],
                },
            });
        }

        console.log('[migratePlanQuotas] Migration complete:', JSON.stringify(results));
        return { success: true, results };
    }
);
