import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';

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

        // Target quotas — 4-plan model (Free + Basic/Pro/Team):
        //
        //   Tier   | Docs | Pages/mes | Queries/mes | Storage  | Hebrew/mes
        //   -------|------|-----------|-------------|----------|-----------
        //   Free   |    0 |         0 |          50 |     0 MB |          2
        //   Basic  |   15 |     2,000 |         500 |   500 MB |          5
        //   Pro    |   50 |    10,000 |       2,000 |  2000 MB |         -1
        //   Team   |  200 |    50,000 |          -1 | 10000 MB |         -1
        const quotasByPlanId: Record<string, {
            libraryDocsLimit: number;
            pagesProcessedPerMonth: number;
            queriesPerMonth: number;
            libraryStorageMB: number;
            hebrewSessionsPerMonth: number;
        }> = {
            free: {
                libraryDocsLimit: 0,
                pagesProcessedPerMonth: 0,
                queriesPerMonth: 50,
                libraryStorageMB: 0,
                hebrewSessionsPerMonth: 2,
            },
            basic: {
                libraryDocsLimit: 15,
                pagesProcessedPerMonth: 2_000,
                queriesPerMonth: 500,
                libraryStorageMB: 500,
                hebrewSessionsPerMonth: 5,
            },
            pro: {
                libraryDocsLimit: 50,
                pagesProcessedPerMonth: 10_000,
                queriesPerMonth: 2_000,
                libraryStorageMB: 2_000,
                hebrewSessionsPerMonth: -1,
            },
            team: {
                libraryDocsLimit: 200,
                pagesProcessedPerMonth: 50_000,
                queriesPerMonth: -1,  // Unlimited
                libraryStorageMB: 10_000,
                hebrewSessionsPerMonth: -1,
            },
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
                updatedAt: new Date(),
            }, { merge: true });
            results.push({
                planId,
                action: 'updated',
                details: { quotas: quotasByPlanId[planId] },
            });
        }

        console.log('[migratePlanQuotas] Migration complete:', JSON.stringify(results));
        return { success: true, results };
    }
);
