import { onRequest } from 'firebase-functions/v2/https';
import { stripe, STRIPE_WEBHOOK_SECRET } from '../config/stripe';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import Stripe from 'stripe';

export const stripeWebhook = onRequest(async (request, response) => {
    const sig = request.headers['stripe-signature'];

    if (!sig) {
        console.error('No stripe-signature header');
        response.status(400).send('No stripe-signature header');
        return;
    }

    if (!STRIPE_WEBHOOK_SECRET) {
        console.error('STRIPE_WEBHOOK_SECRET is not configured');
        response.status(500).send('Webhook secret not configured');
        return;
    }

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(
            request.rawBody,
            sig,
            STRIPE_WEBHOOK_SECRET
        );
    } catch (err: any) {
        console.error('Webhook signature verification failed:', err.message);
        response.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }

    const db = getFirestore();

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                await handleCheckoutCompleted(db, session);
                break;
            }

            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription;
                await handleSubscriptionUpdated(db, subscription);
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                await handleSubscriptionDeleted(db, subscription);
                break;
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object as Stripe.Invoice;
                await handlePaymentFailed(db, invoice);
                break;
            }

            case 'invoice.payment_succeeded': {
                const invoice = event.data.object as Stripe.Invoice;
                await handlePaymentSucceeded(db, invoice);
                break;
            }

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        response.json({ received: true });
    } catch (error: any) {
        console.error('Error processing webhook:', error);
        response.status(500).send(`Webhook Error: ${error.message}`);
    }
});

async function handleCheckoutCompleted(
    db: FirebaseFirestore.Firestore,
    session: Stripe.Checkout.Session
) {
    const firebaseUID = session.metadata?.firebaseUID;
    if (!firebaseUID) {
        console.error('No firebaseUID in checkout session metadata');
        return;
    }

    const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
    const priceId = subscription.items.data[0].price.id;

    // Get plan from plans collection by Stripe price ID
    const plansSnapshot = await db.collection('plans')
        .where('stripeProductIds', 'array-contains', priceId)
        .limit(1)
        .get();

    if (plansSnapshot.empty) {
        console.error(`No plan found for priceId: ${priceId}`);
        return;
    }

    const planDoc = plansSnapshot.docs[0];
    const planId = planDoc.id;

    await db.collection('users').doc(firebaseUID).update({
        subscription: {
            id: subscription.id,
            planId,
            status: subscription.status,
            stripePriceId: priceId,
            startDate: FieldValue.serverTimestamp(),
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            updatedAt: FieldValue.serverTimestamp(),
        },
    });

    console.log(`Subscription activated for user ${firebaseUID}`);
}

async function handleSubscriptionUpdated(
    db: FirebaseFirestore.Firestore,
    subscription: Stripe.Subscription
) {
    const firebaseUID = subscription.metadata?.firebaseUID;
    if (!firebaseUID) {
        console.error('No firebaseUID in subscription metadata');
        return;
    }

    await db.collection('users').doc(firebaseUID).update({
        'subscription.status': subscription.status,
        'subscription.currentPeriodStart': new Date(subscription.current_period_start * 1000),
        'subscription.currentPeriodEnd': new Date(subscription.current_period_end * 1000),
        'subscription.cancelAtPeriodEnd': subscription.cancel_at_period_end,
        'subscription.updatedAt': FieldValue.serverTimestamp(),
    });

    console.log(`Subscription updated for user ${firebaseUID}`);
}

async function handleSubscriptionDeleted(
    db: FirebaseFirestore.Firestore,
    subscription: Stripe.Subscription
) {
    const firebaseUID = subscription.metadata?.firebaseUID;
    if (!firebaseUID) {
        console.error('No firebaseUID in subscription metadata');
        return;
    }

    await db.collection('users').doc(firebaseUID).update({
        'subscription.status': 'cancelled',
        'subscription.updatedAt': FieldValue.serverTimestamp(),
    });

    console.log(`Subscription deleted for user ${firebaseUID}`);
}

async function handlePaymentFailed(
    db: FirebaseFirestore.Firestore,
    invoice: Stripe.Invoice
) {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
    const firebaseUID = subscription.metadata?.firebaseUID;

    if (!firebaseUID) {
        console.error('No firebaseUID in subscription metadata');
        return;
    }

    const userRef = db.collection('users').doc(firebaseUID);
    const userDoc = await userRef.get();
    const currentAttempts = userDoc.data()?.subscription?.failedPaymentAttempts || 0;

    await userRef.update({
        'subscription.status': 'past_due',
        'subscription.failedPaymentAttempts': currentAttempts + 1,
        'subscription.lastPaymentError': {
            message: invoice.last_finalization_error?.message || 'Payment failed',
            attemptedAt: FieldValue.serverTimestamp(),
        },
        'subscription.updatedAt': FieldValue.serverTimestamp(),
    });

    console.log(`Payment failed for user ${firebaseUID}, attempt ${currentAttempts + 1}`);
}

async function handlePaymentSucceeded(
    db: FirebaseFirestore.Firestore,
    invoice: Stripe.Invoice
) {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
    const firebaseUID = subscription.metadata?.firebaseUID;

    if (!firebaseUID) {
        console.error('No firebaseUID in subscription metadata');
        return;
    }

    await db.collection('users').doc(firebaseUID).update({
        'subscription.status': 'active',
        'subscription.failedPaymentAttempts': 0,
        'subscription.lastPaymentError': FieldValue.delete(),
        'subscription.updatedAt': FieldValue.serverTimestamp(),
    });

    console.log(`Payment succeeded for user ${firebaseUID}`);
}
