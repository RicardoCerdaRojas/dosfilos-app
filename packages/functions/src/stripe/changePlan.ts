import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { stripe } from '../config/stripe';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

interface ChangePlanData {
    newPriceId: string;
}

export const changePlan = onCall<ChangePlanData>(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = request.auth.uid;
    const { newPriceId } = request.data;

    if (!newPriceId) {
        throw new HttpsError('invalid-argument', 'newPriceId is required');
    }

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

        // Get current subscription
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const currentItemId = subscription.items.data[0].id;

        // Update subscription with new price (with proration)
        const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
            items: [
                {
                    id: currentItemId,
                    price: newPriceId,
                },
            ],
            proration_behavior: 'create_prorations',
        });

        // Get new plan from Firestore
        const plansSnapshot = await db.collection('plans')
            .where('stripeProductIds', 'array-contains', newPriceId)
            .limit(1)
            .get();

        if (plansSnapshot.empty) {
            console.error(`No plan found for priceId: ${newPriceId}`);
            throw new HttpsError('not-found', 'Plan not found');
        }

        const newPlanId = plansSnapshot.docs[0].id;

        // Update Firestore
        await db.collection('users').doc(userId).update({
            'subscription.planId': newPlanId,
            'subscription.stripePriceId': newPriceId,
            'subscription.currentPeriodStart': new Date(updatedSubscription.current_period_start * 1000),
            'subscription.currentPeriodEnd': new Date(updatedSubscription.current_period_end * 1000),
            'subscription.updatedAt': FieldValue.serverTimestamp(),
        });

        return {
            success: true,
            subscription: {
                planId: newPlanId,
                currentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000),
            },
        };
    } catch (error: any) {
        console.error('Error changing plan:', error);
        throw new HttpsError('internal', error.message || 'Failed to change plan');
    }
});
