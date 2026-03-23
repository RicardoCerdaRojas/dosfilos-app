import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { stripe } from '../config/stripe';

/**
 * Cloud Function: Disable User (Soft)
 *
 * Disables a Firebase Auth account and marks the Firestore user document
 * as disabled. The user's data (sermons, sessions, etc.) is preserved.
 * Reversible via enableUser.
 *
 * Additionally pauses any active Stripe subscription so billing stops
 * without permanently cancelling the customer record.
 */
export const disableUser = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const callerUid = request.auth.uid;
    const db = admin.firestore();

    // Verify Super Admin Role
    const callerDoc = await db.collection('users').doc(callerUid).get();
    if (!callerDoc.exists || callerDoc.data()?.role !== 'super_admin') {
        throw new HttpsError('permission-denied', 'Only super admins can disable users');
    }

    const { userId } = request.data;
    if (!userId) {
        throw new HttpsError('invalid-argument', 'Target userId is required');
    }
    if (userId === callerUid) {
        throw new HttpsError('invalid-argument', 'Cannot disable your own admin account');
    }

    try {
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            throw new HttpsError('not-found', `User ${userId} not found`);
        }

        const userData = userDoc.data()!;

        // 1. Disable Firebase Auth account
        await admin.auth().updateUser(userId, { disabled: true });
        console.log(`Disabled Firebase Auth account for ${userId}`);

        // 2. Pause Stripe subscription (if active)
        if (userData.stripeCustomerId) {
            try {
                const subscriptions = await stripe.subscriptions.list({
                    customer: userData.stripeCustomerId,
                    status: 'active',
                    limit: 1,
                });

                if (subscriptions.data.length > 0) {
                    await stripe.subscriptions.update(subscriptions.data[0].id, {
                        pause_collection: { behavior: 'void' },
                    });
                    console.log(`Paused Stripe subscription for customer ${userData.stripeCustomerId}`);
                }
            } catch (stripeError) {
                // Log but don't block — subscription pause is best-effort
                console.error('Error pausing Stripe subscription:', stripeError);
            }
        }

        // 3. Update Firestore user document
        await userRef.update({
            status: 'disabled',
            disabledAt: FieldValue.serverTimestamp(),
            disabledBy: callerUid,
            updatedAt: FieldValue.serverTimestamp(),
        });

        console.log(`User ${userId} disabled by admin ${callerUid}`);
        return { success: true, message: `User ${userId} has been disabled.` };

    } catch (error: any) {
        if (error instanceof HttpsError) throw error;
        console.error('Error disabling user:', error);
        throw new HttpsError('internal', error.message || 'Failed to disable user');
    }
});
