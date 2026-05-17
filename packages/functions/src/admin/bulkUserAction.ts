import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { stripe } from '../config/stripe';
import { writeAuditLog } from './auditLog';
import { appCheckCallableOptions } from '../config/appCheckOptions';

type BulkAction = 'disable' | 'enable';

interface BulkUserActionRequest {
    userIds: string[];
    action: BulkAction;
}

interface PerUserResult {
    userId: string;
    success: boolean;
    error?: string;
}

const MAX_BATCH = 50;

/**
 * Cloud Function: Bulk disable / enable.
 *
 * Applies the same per-user side effects as `disableUser` / `enableUser` but
 * across a batch of userIds. Fail-isolated: one user's failure does not abort
 * the rest. Returns a per-user result so the UI can show "X ok, Y failed".
 *
 * Cap of {@link MAX_BATCH} per call keeps each invocation under the 60s
 * function timeout — the UI can chunk larger batches client-side.
 *
 * Why one Cloud Function instead of N parallel calls from the client:
 *   - Admin SDK already authenticated, no extra round-trips
 *   - Stripe rate limits (~100 req/sec) honored centrally
 *   - Single audit log entry summarises the batch
 */
export const bulkUserAction = onCall<BulkUserActionRequest>(
    { ...appCheckCallableOptions(), secrets: ['STRIPE_SECRET_KEY'], timeoutSeconds: 540 },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'User must be authenticated');
        }

        const callerUid = request.auth.uid;
        const db = admin.firestore();

        const callerDoc = await db.collection('users').doc(callerUid).get();
        if (!callerDoc.exists || callerDoc.data()?.role !== 'super_admin') {
            throw new HttpsError('permission-denied', 'Only super admins can run bulk actions');
        }

        const { userIds, action } = request.data ?? ({} as BulkUserActionRequest);
        if (!Array.isArray(userIds) || userIds.length === 0) {
            throw new HttpsError('invalid-argument', 'userIds must be a non-empty array');
        }
        if (userIds.length > MAX_BATCH) {
            throw new HttpsError(
                'invalid-argument',
                `Max ${MAX_BATCH} users per batch — chunk client-side and retry.`,
            );
        }
        if (action !== 'disable' && action !== 'enable') {
            throw new HttpsError('invalid-argument', 'action must be "disable" or "enable"');
        }
        if (userIds.includes(callerUid)) {
            throw new HttpsError('invalid-argument', 'Cannot include your own admin account');
        }

        const results: PerUserResult[] = [];

        for (const userId of userIds) {
            try {
                const userRef = db.collection('users').doc(userId);
                const userDoc = await userRef.get();
                if (!userDoc.exists) {
                    results.push({ userId, success: false, error: 'User not found' });
                    continue;
                }
                const userData = userDoc.data()!;

                if (action === 'disable') {
                    await admin.auth().updateUser(userId, { disabled: true });
                    if (userData.stripeCustomerId) {
                        try {
                            const subs = await stripe.subscriptions.list({
                                customer: userData.stripeCustomerId,
                                status: 'active',
                                limit: 1,
                            });
                            if (subs.data.length > 0) {
                                await stripe.subscriptions.update(subs.data[0].id, {
                                    pause_collection: { behavior: 'void' },
                                });
                            }
                        } catch (stripeErr) {
                            console.warn(`[bulkUserAction] Stripe pause failed for ${userId}:`, stripeErr);
                        }
                    }
                    await userRef.update({
                        status: 'disabled',
                        disabledAt: FieldValue.serverTimestamp(),
                        disabledBy: callerUid,
                        updatedAt: FieldValue.serverTimestamp(),
                    });
                } else {
                    await admin.auth().updateUser(userId, { disabled: false });
                    if (userData.stripeCustomerId) {
                        try {
                            const subs = await stripe.subscriptions.list({
                                customer: userData.stripeCustomerId,
                                status: 'paused',
                                limit: 1,
                            });
                            if (subs.data.length > 0) {
                                await stripe.subscriptions.update(subs.data[0].id, {
                                    pause_collection: '',
                                } as any);
                            }
                        } catch (stripeErr) {
                            console.warn(`[bulkUserAction] Stripe resume failed for ${userId}:`, stripeErr);
                        }
                    }
                    await userRef.update({
                        status: 'active',
                        disabledAt: FieldValue.delete(),
                        disabledBy: FieldValue.delete(),
                        updatedAt: FieldValue.serverTimestamp(),
                    });
                }

                results.push({ userId, success: true });
            } catch (err: any) {
                console.error(`[bulkUserAction] Failed for ${userId}:`, err);
                results.push({ userId, success: false, error: err?.message ?? 'Unknown error' });
            }
        }

        const okCount = results.filter(r => r.success).length;
        const failCount = results.length - okCount;

        writeAuditLog({
            actorUid: callerUid,
            actorEmail: callerDoc.data()?.email,
            action: action === 'disable' ? 'user.bulk_disable' : 'user.bulk_enable',
            details: {
                requested: userIds.length,
                ok: okCount,
                failed: failCount,
                failedIds: results.filter(r => !r.success).map(r => r.userId),
            },
        });

        return { results, ok: okCount, failed: failCount };
    },
);
