import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * One-shot migration: upserts the new personal-library quota fields (libraryDocsLimit,
 * pagesProcessedPerMonth, queriesPerMonth) into basic/pro/team plans in Firestore.
 *
 * No free tier — Stripe's 30-day trial on every plan handles onboarding. New users
 * pick a paid plan at registration and start a trial; they can cancel anytime during
 * the trial without charge.
 *
 * Run this AFTER deploying the new quota infrastructure and BEFORE exposing quotas
 * to end users. Idempotent — safe to run multiple times.
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

        // Target quotas — 3-plan model (no Free; 30-day Stripe trial handles onboarding):
        //
        //   Tier   | Docs | Pages/mes | Queries/mes | Storage
        //   -------|------|-----------|-------------|---------
        //   Basic  |   15 |     2,000 |         500 |   500 MB
        //   Pro    |   50 |    10,000 |       2,000 |  2000 MB
        //   Team   |  200 |    50,000 |          -1 | 10000 MB  (-1 = unlimited)
        const quotasByPlanId: Record<string, {
            libraryDocsLimit: number;
            pagesProcessedPerMonth: number;
            queriesPerMonth: number;
            libraryStorageMB: number;
        }> = {
            basic: {
                libraryDocsLimit: 15,
                pagesProcessedPerMonth: 2_000,
                queriesPerMonth: 500,
                libraryStorageMB: 500,
            },
            pro: {
                libraryDocsLimit: 50,
                pagesProcessedPerMonth: 10_000,
                queriesPerMonth: 2_000,
                libraryStorageMB: 2_000,
            },
            team: {
                libraryDocsLimit: 200,
                pagesProcessedPerMonth: 50_000,
                queriesPerMonth: -1,  // Unlimited
                libraryStorageMB: 10_000,
            },
        };

        const results: Array<{ planId: string; action: 'updated' | 'created' | 'skipped'; details?: any }> = [];

        // Merge quota fields into existing plans (basic, pro, team)
        for (const planId of ['basic', 'pro', 'team'] as const) {
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
