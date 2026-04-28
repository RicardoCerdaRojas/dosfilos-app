import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { stripe } from '../config/stripe';
import { writeAuditLog } from './auditLog';

interface ExtendUserTrialAdminRequest {
    userId: string;
    days: number;
    reason: string;
}

/**
 * Cloud Function: Admin extends a user's trial period.
 *
 * Distinct from the user-self-service `extendTrial`:
 *   - Caller is super_admin acting on behalf of any user
 *   - No quota / one-time-use limit (admin discretion)
 *   - Requires a `reason` for the audit log
 *   - Updates BOTH Stripe (if there's an active subscription) AND Firestore
 *
 * Bounds: `days` must be 1..90 to prevent fat-fingered "9999 days" mistakes
 * that would create a permanent free-rider account.
 */
export const extendUserTrialAdmin = onCall<ExtendUserTrialAdminRequest>(
    { secrets: ['STRIPE_SECRET_KEY'] },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'User must be authenticated');
        }

        const callerUid = request.auth.uid;
        const db = admin.firestore();

        const callerDoc = await db.collection('users').doc(callerUid).get();
        if (!callerDoc.exists || callerDoc.data()?.role !== 'super_admin') {
            throw new HttpsError('permission-denied', 'Only super admins can extend trials');
        }

        const { userId, days, reason } = request.data ?? ({} as ExtendUserTrialAdminRequest);
        if (!userId || !reason?.trim()) {
            throw new HttpsError('invalid-argument', 'userId and reason are required');
        }
        if (!Number.isFinite(days) || days < 1 || days > 90) {
            throw new HttpsError('invalid-argument', 'days must be between 1 and 90');
        }

        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            throw new HttpsError('not-found', `User ${userId} not found`);
        }
        const userData = userDoc.data()!;

        const currentTrialEnd: Date | null = userData.subscription?.trialEnd?.toDate?.() ?? null;
        // Anchor the extension on the LATER of "now" or the existing trial end.
        // This way an expired trial can be reopened and a still-active trial
        // gets extended cumulatively.
        const anchor = currentTrialEnd && currentTrialEnd > new Date() ? currentTrialEnd : new Date();
        const newTrialEnd = new Date(anchor.getTime() + days * 24 * 60 * 60 * 1000);

        // Update Stripe trial if there's a live subscription. Stripe accepts
        // `trial_end` as a unix timestamp.
        const stripeSubId: string | undefined = userData.subscription?.id;
        if (stripeSubId) {
            try {
                await stripe.subscriptions.update(stripeSubId, {
                    trial_end: Math.floor(newTrialEnd.getTime() / 1000),
                    proration_behavior: 'none',
                });
            } catch (err) {
                console.warn(`[extendUserTrialAdmin] Stripe update failed for sub ${stripeSubId}:`, err);
                // Continue — Firestore is the source of truth for the UI; Stripe
                // will be reconciled on the next webhook event.
            }
        }

        await userRef.update({
            'subscription.trialEnd': Timestamp.fromDate(newTrialEnd),
            'subscription.status': 'trialing',
            'subscription.updatedAt': FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        writeAuditLog({
            actorUid: callerUid,
            actorEmail: callerDoc.data()?.email,
            action: 'user.extend_trial',
            targetUid: userId,
            targetEmail: userData.email,
            details: {
                days,
                previousTrialEnd: currentTrialEnd?.toISOString() ?? null,
                newTrialEnd: newTrialEnd.toISOString(),
                reason,
            },
        });

        return { success: true, newTrialEnd: newTrialEnd.toISOString() };
    },
);
