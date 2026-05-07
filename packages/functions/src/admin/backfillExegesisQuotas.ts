import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { setExegesisPlanQuotaAdmin } from '../library/processingBalance';

/**
 * Sister of `backfillPlanQuotas` for the EXEGESIS_PRICING_INTEGRATION
 * Fase 6 rollout. Walks the `users` collection and seeds each active
 * paid subscriber's exégesis PLAN bucket with their plan's
 * `limits.exegesisUsdPerMonth`. Without this, existing Pro/Team
 * subscribers see "0 estudios" until their next Stripe invoice fires
 * (up to 30 days), and the upgrade modal would prompt them despite
 * their plan including the allowance.
 *
 * Idempotent via the same `users/{uid}/monthly_grants/{markerId}`
 * pattern. Marker prefix is `exegesis-backfill-{ts}` so this can run
 * independently of the page-quota backfill (different markerIds).
 *
 * Skips when:
 *   - user has no subscription (free / signup-only)
 *   - subscription status is not active/trialing
 *   - plan has `exegesisUsdPerMonth = 0` (free, basic — gated)
 *   - marker doc already exists (re-run with same ts is a no-op)
 *
 * Trigger: Firebase Console → Functions → backfillExegesisQuotas →
 * `{ "dryRun": true }` first to preview, then `{}` to execute.
 *
 * Spec: docs/EXEGESIS_PRICING_INTEGRATION.md §9.
 */
export const backfillExegesisQuotas = onCall<{ dryRun?: boolean }>(
    {
        region: 'us-central1',
        memory: '512MiB',
        timeoutSeconds: 300,
        cors: true,
    },
    async (request) => {
        if (!request.auth || request.auth.token?.email !== 'rdocerda@gmail.com') {
            throw new HttpsError('permission-denied', 'Only admin can run backfills');
        }

        const dryRun = request.data?.dryRun === true;
        const db = getFirestore();
        const ts = Date.now();
        const markerId = `exegesis-backfill-${ts}`;

        const planSnap = await db.collection('plans').get();
        const planAllowances = new Map<string, number>();
        planSnap.docs.forEach(doc => {
            const limits = doc.data().limits ?? {};
            planAllowances.set(doc.id, Math.max(0, Number(limits.exegesisUsdPerMonth) || 0));
        });

        const usersSnap = await db.collection('users').get();
        const summary = {
            scanned: 0,
            credited: 0,
            skippedNoSubscription: 0,
            skippedFreeOrInactive: 0,
            skippedNoAllowance: 0,
            skippedAlreadyMarked: 0,
            errors: [] as Array<{ userId: string; reason: string }>,
            grantsByPlan: {} as Record<string, number>,
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
                await setExegesisPlanQuotaAdmin(userDoc.id, allowanceUsd);
                await grantRef.set({
                    invoiceId: markerId,
                    planId,
                    exegesisUsdQuota: allowanceUsd,
                    billingReason: 'admin-backfill-exegesis',
                    grantedAt: FieldValue.serverTimestamp(),
                });
                summary.credited++;
                summary.grantsByPlan[planId] = (summary.grantsByPlan[planId] ?? 0) + 1;
            } catch (err: any) {
                summary.errors.push({
                    userId: userDoc.id,
                    reason: err?.message ?? String(err),
                });
            }
        }

        console.log('[backfillExegesisQuotas]', JSON.stringify(summary, null, 2));
        return { success: true, dryRun, markerId, summary };
    },
);
