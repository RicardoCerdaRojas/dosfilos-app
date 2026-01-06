import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { stripe } from '../config/stripe';
import { getFirestore } from 'firebase-admin/firestore';

interface CheckoutSessionData {
    priceId: string;
    successUrl?: string;
    cancelUrl?: string;
}

export const createCheckoutSession = onCall<CheckoutSessionData>(async (request) => {
    // Verify authentication
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = request.auth.uid;
    const { priceId, successUrl, cancelUrl } = request.data;

    if (!priceId) {
        throw new HttpsError('invalid-argument', 'priceId is required');
    }

    try {
        const db = getFirestore();
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            throw new HttpsError('not-found', 'User profile not found');
        }

        const userData = userDoc.data()!;
        let customerId = userData.stripeCustomerId;

        // Create Stripe customer if doesn't exist
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: userData.email,
                metadata: {
                    firebaseUID: userId,
                },
            });

            customerId = customer.id;

            // Save customer ID to Firestore
            await userRef.update({
                stripeCustomerId: customerId,
            });
        }

        // Create checkout session
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: successUrl || `${process.env.FRONTEND_URL}/dashboard/settings?success=true`,
            cancel_url: cancelUrl || `${process.env.FRONTEND_URL}/dashboard/settings?canceled=true`,
            metadata: {
                firebaseUID: userId,
            },
            allow_promotion_codes: true,
            billing_address_collection: 'required',
            subscription_data: {
                metadata: {
                    firebaseUID: userId,
                },
            },
        });

        return { sessionId: session.id, url: session.url };
    } catch (error: any) {
        console.error('Error creating checkout session:', error);
        throw new HttpsError('internal', error.message || 'Failed to create checkout session');
    }
});
