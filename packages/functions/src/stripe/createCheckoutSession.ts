import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { stripe } from '../config/stripe';
import { getFirestore } from 'firebase-admin/firestore';

interface CheckoutSessionData {
    priceId: string;
    successUrl?: string;
    cancelUrl?: string;
    // New registration metadata
    isNewRegistration?: boolean;
    displayName?: string;
    locale?: 'en' | 'es';
}

export const createCheckoutSession = onCall<CheckoutSessionData>(async (request) => {
    // Verify authentication
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = request.auth.uid;
    const {
        priceId,
        successUrl,
        cancelUrl,
        isNewRegistration = false,
        displayName,
        locale = 'es'
    } = request.data;

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

        // Determine success and cancel URLs
        const baseUrl = process.env.FRONTEND_URL;
        const finalSuccessUrl = isNewRegistration
            ? `${baseUrl}/auth/registration-success?session_id={CHECKOUT_SESSION_ID}`
            : successUrl || `${baseUrl}/dashboard/settings?success=true`;
        const finalCancelUrl = cancelUrl || `${baseUrl}/pricing?canceled=true`;

        // Prepare metadata
        const metadata: Record<string, string> = {
            firebaseUID: userId,
        };

        // Add registration-specific metadata
        if (isNewRegistration) {
            metadata.isNewRegistration = 'true';
            if (displayName) metadata.displayName = displayName;
            if (locale) metadata.locale = locale;
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
            success_url: finalSuccessUrl,
            cancel_url: finalCancelUrl,
            metadata,
            allow_promotion_codes: true,
            billing_address_collection: 'required',
            subscription_data: {
                trial_period_days: 30, // 30-day trial for all new subscriptions
                metadata,
            },
        });

        return { sessionId: session.id, url: session.url };
    } catch (error: any) {
        console.error('Error creating checkout session:', error);
        throw new HttpsError('internal', error.message || 'Failed to create checkout session');
    }
});
