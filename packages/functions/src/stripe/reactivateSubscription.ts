import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { stripe } from '../config/stripe';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

export const reactivateSubscription = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = request.auth.uid;

    try {
        const db = getFirestore();
        const userDoc = await db.collection('users').doc(userId).get();

        if (!userDoc.exists) {
            throw new HttpsError('not-found', 'User profile not found');
        }

        const userData = userDoc.data()!;
        const subscriptionId = userData.subscription?.id;
        const cancelAtPeriodEnd = userData.subscription?.cancelAtPeriodEnd;

        if (!subscriptionId) {
            throw new HttpsError('failed-precondition', 'No subscription found');
        }

        if (!cancelAtPeriodEnd) {
            throw new HttpsError('failed-precondition', 'Subscription is not scheduled for cancellation');
        }

        // Reactivate subscription
        await stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: false,
        });

        // Update Firestore
        await db.collection('users').doc(userId).update({
            'subscription.status': 'active',
            'subscription.cancelledAt': FieldValue.delete(),
            'subscription.cancelAtPeriodEnd': false,
            'subscription.updatedAt': FieldValue.serverTimestamp(),
        });

        return { success: true };
    } catch (error: any) {
        console.error('Error reactivating subscription:', error);
        throw new HttpsError('internal', error.message || 'Failed to reactivate subscription');
    }
});
