import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { stripe } from '../config/stripe';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

export const cancelSubscription = onCall(async (request) => {
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

        if (!subscriptionId) {
            throw new HttpsError('failed-precondition', 'No active subscription found');
        }

        // Cancel at period end (grace period)
        const subscription = await stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: true,
        });

        // Update Firestore
        await db.collection('users').doc(userId).update({
            'subscription.status': 'cancelled',
            'subscription.cancelledAt': FieldValue.serverTimestamp(),
            'subscription.cancelAtPeriodEnd': true,
            'subscription.updatedAt': FieldValue.serverTimestamp(),
        });

        return {
            success: true,
            cancelAt: new Date(subscription.current_period_end * 1000),
        };
    } catch (error: any) {
        console.error('Error canceling subscription:', error);
        throw new HttpsError('internal', error.message || 'Failed to cancel subscription');
    }
});
