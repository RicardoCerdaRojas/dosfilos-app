import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { writeAuditLog } from './auditLog';
import {
    setPlanQuotaAdmin,
    setExegesisPlanQuotaAdmin,
} from '../library/processingBalance';
import { appCheckCallableOptions } from '../config/appCheckOptions';

interface ResetUserPlanQuotaRequest {
    userId: string;
    reason: string;
}

interface ResetUserPlanQuotaResponse {
    success: true;
    planId: string;
    appliedQuotas: {
        standardPages: number;
        premiumPages: number;
        exegesisUsd: number;
    };
}

/**
 * Cloud Function: Admin-driven monthly plan quota reset.
 *
 * Overwrites the user's *plan* buckets back to the values declared in their
 * current plan's `limits.{standardPagesPerMonth, premiumPagesPerMonth,
 * exegesisUsdPerMonth}`. Pack buckets (prepaid credit purchases) are NOT
 * touched — those persist across renewals by design.
 *
 * Independent from `changePlanForUser`: this only resets the buckets to the
 * plan's standard monthly allowance. Common use cases:
 *
 *   1. Comp accounts where admin granted a paid plan via `changePlanForUser`
 *      on a user without a Stripe customer — there's no Stripe webhook to
 *      trigger the initial quota seed, so admin runs this to provision.
 *   2. Webhook failures: invoice.paid never reached us; manual renewal.
 *   3. Bug compensation when consumption was over-debited and recompute is
 *      simpler than reversing each transaction.
 *   4. Support cases / dispute resolution.
 *
 * Stripe billing is NOT touched. Subscription doc is NOT touched. Pack
 * balances are NOT touched. Only plan buckets + their `updatedAt`.
 */
export const resetUserPlanQuota = onCall<ResetUserPlanQuotaRequest>(appCheckCallableOptions(), async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const callerUid = request.auth.uid;
    const db = admin.firestore();

    const callerDoc = await db.collection('users').doc(callerUid).get();
    if (!callerDoc.exists || callerDoc.data()?.role !== 'super_admin') {
        throw new HttpsError('permission-denied', 'Only super admins can reset quotas');
    }

    const { userId, reason } = request.data ?? ({} as ResetUserPlanQuotaRequest);
    if (!userId || !reason?.trim()) {
        throw new HttpsError('invalid-argument', 'userId and reason are required');
    }

    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
        throw new HttpsError('not-found', `User ${userId} not found`);
    }
    const userData = userDoc.data()!;
    const planId: string = userData.subscription?.planId ?? 'free';

    // Read the plan's monthly allowances. Missing plan doc → fall back to
    // zero so a corrupted state doesn't crash the request; admin sees the
    // applied 0s in the audit log and can act on it.
    const planDoc = await db.collection('plans').doc(planId).get();
    const planLimits = (planDoc.exists ? planDoc.data()?.limits : undefined) ?? {};
    const standardPages: number = Math.max(0, planLimits.standardPagesPerMonth ?? 0);
    const premiumPages: number = Math.max(0, planLimits.premiumPagesPerMonth ?? 0);
    const exegesisUsd: number = Math.max(0, planLimits.exegesisUsdPerMonth ?? 0);

    try {
        // Both calls overwrite (not increment). Plan buckets only; pack buckets
        // pass through untouched inside the helpers (they compose the new
        // aggregate `*PagesAvailable` from `plan + pack`).
        await setPlanQuotaAdmin(userId, 'standard', standardPages);
        await setPlanQuotaAdmin(userId, 'premium', premiumPages);
        await setExegesisPlanQuotaAdmin(userId, exegesisUsd);

        writeAuditLog({
            actorUid: callerUid,
            actorEmail: callerDoc.data()?.email,
            action: 'user.reset_quota',
            targetUid: userId,
            targetEmail: userData.email,
            details: {
                planId,
                standardPages,
                premiumPages,
                exegesisUsd,
                reason,
            },
        });

        const response: ResetUserPlanQuotaResponse = {
            success: true,
            planId,
            appliedQuotas: { standardPages, premiumPages, exegesisUsd },
        };
        return response;
    } catch (error: any) {
        if (error instanceof HttpsError) throw error;
        console.error('[resetUserPlanQuota] Failed:', error);
        throw new HttpsError('internal', error.message || 'Failed to reset quota');
    }
});
