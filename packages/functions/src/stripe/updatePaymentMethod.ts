import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { stripe } from '../config/stripe';
import { getFirestore } from 'firebase-admin/firestore';

interface UpdatePaymentMethodData {
    paymentMethodId: string;
}

export const updatePaymentMethod = onCall<UpdatePaymentMethodData>(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = request.auth.uid;
    const { paymentMethodId } = request.data;

    if (!paymentMethodId) {
        throw new HttpsError('invalid-argument', 'paymentMethodId is required');
    }

    try {
        const db = getFirestore();
        const userDoc = await db.collection('users').doc(userId).get();

        if (!userDoc.exists) {
            throw new HttpsError('not-found', 'User profile not found');
        }

        const userData = userDoc.data()!;
        const customerId = userData.stripeCustomerId;

        if (!customerId) {
            throw new HttpsError('failed-precondition', 'No Stripe customer found');
        }

        const subscriptionId = userData.subscription?.id;
        if (!subscriptionId) {
            throw new HttpsError('failed-precondition', 'No active subscription found');
        }

        // Attach payment method to customer
        await stripe.paymentMethods.attach(paymentMethodId, {
            customer: customerId,
        });

        // Set as default payment method
        await stripe.customers.update(customerId, {
            invoice_settings: {
                default_payment_method: paymentMethodId,
            },
        });

        // Update subscription to use new payment method
        await stripe.subscriptions.update(subscriptionId, {
            default_payment_method: paymentMethodId,
        });

        return { success: true };
    } catch (error: any) {
        console.error('Error updating payment method:', error);
        throw new HttpsError('internal', error.message || 'Failed to update payment method');
    }
});
