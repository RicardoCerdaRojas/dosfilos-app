import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { setPlanQuotaAdmin } from '../library/processingBalance';

/**
 * One-shot backfill for existing subscribers.
 *
 * The monthly-renewal webhook (`applyMonthlyQuotaIfPending` in
 * `stripe/webhook.ts`) only credits going forward — when the next
 * invoice fires. That can be up to 30 days away, during which existing
 * Team/Pro/Basic subscribers see "0 pages available" and the upload
 * gate keeps prompting credit-pack purchases. This callable closes that
 * gap: walks the `users` collection, identifies active paid
 * subscriptions, and seeds each user's PLAN bucket with their plan's
 * `{standard,premium}PagesPerMonth`.
 *
 * Idempotent via the same `users/{uid}/monthly_grants/{markerId}`
 * mechanism the webhook uses — markers written here use a
 * `backfill-{timestamp}` prefix so subsequent backfills (e.g. after
 * tweaking the quota table) can re-run with a different timestamp and
 * grant fresh quotas without colliding.
 *
 * Safe to re-run: a re-invocation with the SAME timestamp short-circuits
 * (markers exist), but a new timestamp grants again — admin should
 * coordinate carefully.
 *
 * Trigger: Firebase Console → Functions → backfillPlanQuotas → Test with
 * body `{}` (defaults to dry-run = false). Pass `{ dryRun: true }` to
 * preview without writing.
 */
export const backfillPlanQuotas = onCall<{ dryRun?: boolean }>(
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
        const markerId = `backfill-${ts}`;

        // Cache plan limits to avoid one read per user.
        const planSnap = await db.collection('plans').get();
        const planLimits = new Map<string, { standardPagesPerMonth: number; premiumPagesPerMonth: number }>();
        planSnap.docs.forEach(doc => {
            const limits = doc.data().limits ?? {};
            planLimits.set(doc.id, {
                standardPagesPerMonth: Math.max(0, Number(limits.standardPagesPerMonth) || 0),
                premiumPagesPerMonth: Math.max(0, Number(limits.premiumPagesPerMonth) || 0),
            });
        });

        const usersSnap = await db.collection('users').get();
        const summary = {
            scanned: 0,
            credited: 0,
            skippedNoSubscription: 0,
            skippedFreeOrInactive: 0,
            skippedNoQuota: 0,
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
            const limits = planLimits.get(planId);
            if (!limits || (limits.standardPagesPerMonth === 0 && limits.premiumPagesPerMonth === 0)) {
                summary.skippedNoQuota++;
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
                await setPlanQuotaAdmin(userDoc.id, 'standard', limits.standardPagesPerMonth);
                await setPlanQuotaAdmin(userDoc.id, 'premium', limits.premiumPagesPerMonth);
                await grantRef.set({
                    invoiceId: markerId,
                    planId,
                    standardQuota: limits.standardPagesPerMonth,
                    premiumQuota: limits.premiumPagesPerMonth,
                    billingReason: 'admin-backfill',
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

        console.log('[backfillPlanQuotas]', JSON.stringify(summary, null, 2));
        return { success: true, dryRun, markerId, summary };
    },
);
