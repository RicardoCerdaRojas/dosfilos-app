import { onRequest } from 'firebase-functions/v2/https';
import { stripe, STRIPE_WEBHOOK_SECRET } from '../config/stripe';
import { getFirestore, FieldValue, type Firestore } from 'firebase-admin/firestore';
import Stripe from 'stripe';
import {
    addPackAdmin,
    setPlanQuotaAdmin,
    addExegesisPackAdmin,
    setExegesisPlanQuotaAdmin,
    type ProcessingMode,
} from '../library/processingBalance';
import { getPackById } from './creditPackCatalog';
import { resend } from '../emails/resendClient';
import { getPaymentFailedTemplate, getPaymentFailedSubject } from '../emails/templates/paymentFailed';
import { APP_URL } from '../config/urls';

/**
 * Reverse-resolves a Stripe Price ID to the matching plan doc id by iterating
 * the (small) `plans` collection in memory. Handles both the new
 * `stripePriceIds: { monthly, yearly? }` shape and the legacy
 * `stripeProductIds: string[]` shape so we can deploy this code before the
 * Firestore docs are migrated to the labelled shape.
 */
async function findPlanIdByPriceId(db: Firestore, priceId: string): Promise<string | null> {
    const snap = await db.collection('plans').get();
    for (const doc of snap.docs) {
        const data = doc.data();
        const labelled = data.stripePriceIds;
        if (labelled && (labelled.monthly === priceId || labelled.yearly === priceId)) {
            return doc.id;
        }
        const legacy = Array.isArray(data.stripeProductIds) ? data.stripeProductIds : null;
        if (legacy && legacy.includes(priceId)) {
            return doc.id;
        }
    }
    return null;
}

export const stripeWebhook = onRequest(
    {
        secrets: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'RESEND_API_KEY'],
    },
    async (request, response) => {
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
    // ========================================================================
    // CREDIT-PACK ONE-TIME PURCHASE
    // ========================================================================
    // Detected by metadata.packId set in createCheckoutSession. The session is
    // mode=payment (no subscription created), so we credit the user balance
    // and stop. Idempotent via session.id deduplication.
    if (session.metadata?.packId) {
        await handleCreditPackPurchase(db, session);
        return;
    }

    // ========================================================================
    // NEW REGISTRATION FLOW
    // ========================================================================
    // Check if this is a new registration (payment-first flow)
    if (session.metadata?.isNewRegistration === 'true') {
        console.log('📝 Processing new registration checkout', {
            sessionId: session.id,
            email: session.customer_email,
            displayName: session.metadata?.displayName,
        });

        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
        const priceId = subscription.items.data[0].price.id;

        // Resolve plan id from price id (handles both monthly + yearly).
        const resolvedPlanId = await findPlanIdByPriceId(db, priceId);
        const planId = resolvedPlanId ?? 'basic';

        // Store pending registration for completeRegistration function
        await db.collection('pending_registrations').doc(session.id).set({
            email: session.customer_email,
            displayName: session.metadata?.displayName || '',
            locale: (session.metadata?.locale || 'es') as 'en' | 'es',
            paymentCompleted: true,
            subscription: {
                stripeSubscriptionId: subscription.id,
                stripeCustomerId: subscription.customer as string,
                status: subscription.status,
                planId,
                trialEnd: subscription.trial_end
                    ? new Date(subscription.trial_end * 1000)
                    : null,
                currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            },
            createdAt: new Date(),
        });

        console.log('✅ Pending registration created', {
            sessionId: session.id,
            email: session.customer_email,
            planId,
            status: subscription.status,
        });

        // Don't process further - user will be created by completeRegistration
        return;
    }

    // ========================================================================
    // EXISTING USER FLOW (upgrade/initial subscription)
    // ========================================================================
    const firebaseUID = session.metadata?.firebaseUID;
    if (!firebaseUID) {
        console.error('No firebaseUID in checkout session metadata');
        return;
    }

    const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
    const priceId = subscription.items.data[0].price.id;

    // Resolve plan id from price id (handles both monthly + yearly).
    const planId = await findPlanIdByPriceId(db, priceId);
    if (!planId) {
        console.error(`No plan found for priceId: ${priceId}`);
        return;
    }

    // Prepare subscription data
    const subscriptionData: any = {
        id: subscription.id,
        planId,
        status: subscription.status,
        stripePriceId: priceId,
        startDate: FieldValue.serverTimestamp(),
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        updatedAt: FieldValue.serverTimestamp(),
    };

    // Handle trial period
    if (subscription.trial_end) {
        subscriptionData.trialEnd = new Date(subscription.trial_end * 1000);
        // Trial countdown starts on first login (null until then)
        subscriptionData.trialStartedAt = null;
    }

    await db.collection('users').doc(firebaseUID).update({
        subscription: subscriptionData,
    });

    // Credit the plan's bonusInitial to processingBalance — once per subscription id.
    const planSnap = await db.collection('plans').doc(planId).get();
    await creditBonusInitialIfPending(db, firebaseUID, subscription.id, planSnap.data() ?? {});

    console.log(`Subscription activated for user ${firebaseUID}, trial: ${subscription.trial_end ? 'yes' : 'no'}`);
}

/**
 * Credits a plan's `bonusInitial` standard/premium pages to the user's
 * PLAN bucket on subscription activation. Idempotent: writes a marker
 * doc at `users/{uid}/bonus_grants/{subscriptionId}` so the same
 * subscription never triggers two grants.
 *
 * Routes through `setPlanQuotaAdmin` (not `addPackAdmin`) so the
 * pages land in the plan bucket — they'll be reset by the next
 * billing-cycle invoice, matching the "monthly quota" semantics the
 * user expects from a subscription.
 */
async function creditBonusInitialIfPending(
    db: FirebaseFirestore.Firestore,
    firebaseUID: string,
    subscriptionId: string,
    planData: any,
) {
    const bonus = planData?.bonusInitial ?? {};
    const standardPages = Math.max(0, Number(bonus.standardPages) || 0);
    const premiumPages = Math.max(0, Number(bonus.premiumPages) || 0);
    const exegesisUsd = Math.max(0, Number(bonus.exegesisUsd) || 0);
    if (standardPages === 0 && premiumPages === 0 && exegesisUsd === 0) return;

    const grantRef = db
        .collection('users').doc(firebaseUID)
        .collection('bonus_grants').doc(subscriptionId);

    const existing = await grantRef.get();
    if (existing.exists) {
        console.log(`[BonusInitial] subscription=${subscriptionId} already granted to ${firebaseUID}; skipping`);
        return;
    }

    // SET (not increment) the plan bucket — first cycle starts with the
    // full monthly allotment. Pack pages (if any from prior history)
    // are untouched.
    await setPlanQuotaAdmin(firebaseUID, 'standard', standardPages);
    await setPlanQuotaAdmin(firebaseUID, 'premium', premiumPages);
    if (exegesisUsd > 0) {
        await setExegesisPlanQuotaAdmin(firebaseUID, exegesisUsd);
    }
    await grantRef.set({
        subscriptionId,
        standardPages,
        premiumPages,
        exegesisUsd,
        grantedAt: FieldValue.serverTimestamp(),
    });

    console.log(
        `[BonusInitial] credited ${standardPages} standard + ${premiumPages} premium + $${exegesisUsd} exégesis to ${firebaseUID} plan bucket (subscription=${subscriptionId})`,
    );
}

/**
 * Credits a credit-pack purchase to the user's balance and records the
 * transaction in `users/{uid}/credit_pack_purchases/{sessionId}` for audit /
 * de-duplication. The doc id is the Stripe session id, so retrying the
 * webhook with the same event is naturally idempotent.
 */
async function handleCreditPackPurchase(
    db: FirebaseFirestore.Firestore,
    session: Stripe.Checkout.Session,
) {
    const firebaseUID = session.metadata?.firebaseUID;
    const packId = session.metadata?.packId;
    if (!firebaseUID || !packId) {
        console.error('Credit-pack checkout missing firebaseUID or packId', { firebaseUID, packId });
        return;
    }

    const pack = getPackById(packId);
    if (!pack) {
        console.error(`Unknown credit pack id received from Stripe: ${packId}`);
        return;
    }

    // Idempotency: short-circuit if we already processed this session.
    const purchaseRef = db
        .collection('users').doc(firebaseUID)
        .collection('credit_pack_purchases').doc(session.id);
    const existing = await purchaseRef.get();
    if (existing.exists) {
        console.log(`[CreditPack] Session ${session.id} already credited; skipping`);
        return;
    }

    // Dispatch on pack mode: page-based packs credit pages, exegesis
    // packs credit USD into the LLM-budget bucket.
    if (pack.mode === 'exegesis') {
        const usd = Math.max(0, pack.usdAmount ?? 0);
        await addExegesisPackAdmin(firebaseUID, usd);
        await purchaseRef.set({
            sessionId: session.id,
            packId: pack.id,
            mode: pack.mode,
            usdAmount: usd,
            amountTotal: session.amount_total ?? null,
            currency: session.currency ?? null,
            createdAt: FieldValue.serverTimestamp(),
        });
        await logExegesisPricingActivity(db, firebaseUID, 'exegesis.pack.purchased', {
            packSku: pack.id,
            amountUsd: usd,
        });
        console.log(
            `[CreditPack] Credited $${usd} exégesis to ${firebaseUID} (pack=${pack.id}, session=${session.id})`,
        );
        return;
    }

    await addPackAdmin(firebaseUID, pack.mode as ProcessingMode, pack.pages);
    await purchaseRef.set({
        sessionId: session.id,
        packId: pack.id,
        mode: pack.mode,
        pages: pack.pages,
        amountTotal: session.amount_total ?? null,
        currency: session.currency ?? null,
        createdAt: FieldValue.serverTimestamp(),
    });

    console.log(
        `[CreditPack] Credited ${pack.pages} ${pack.mode} pages to ${firebaseUID} (pack=${pack.id}, session=${session.id})`,
    );
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

    const updateData: any = {
        'subscription.status': subscription.status,
        'subscription.currentPeriodStart': new Date(subscription.current_period_start * 1000),
        'subscription.currentPeriodEnd': new Date(subscription.current_period_end * 1000),
        'subscription.cancelAtPeriodEnd': subscription.cancel_at_period_end,
        'subscription.updatedAt': FieldValue.serverTimestamp(),
    };

    // Update trial end if present
    if (subscription.trial_end) {
        updateData['subscription.trialEnd'] = new Date(subscription.trial_end * 1000);
    }

    await db.collection('users').doc(firebaseUID).update(updateData);

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
    const userData = userDoc.data();
    const currentAttempts = userData?.subscription?.failedPaymentAttempts || 0;

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

    // Recovery email — only on the FIRST failure to avoid spam. Stripe retries
    // the charge automatically over the next ~3 days; if those also fail, the
    // subscription gets cancelled via customer.subscription.deleted, at which
    // point a different (win-back) flow takes over.
    if (currentAttempts === 0 && userData?.email) {
        const locale: 'es' | 'en' = userData?.preferredLanguage === 'en' ? 'en' : 'es';
        const name = userData?.displayName || (locale === 'en' ? 'Preacher' : 'Predicador');
        const dashboardUrl = `${APP_URL}/dashboard`;

        try {
            await resend.emails.send({
                from: 'DosFilos <onboarding@dosfilos.com>',
                to: userData.email,
                subject: getPaymentFailedSubject(locale),
                html: getPaymentFailedTemplate(name, dashboardUrl, locale),
            });
            console.log(`Payment-failed recovery email sent to ${userData.email} (${locale})`);
        } catch (e) {
            console.error(`Failed to send payment-failed email to ${userData.email}`, e);
        }
    }
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

    // Monthly plan-quota reset.
    //
    // Stripe fires `invoice.payment_succeeded` on every invoice — including
    // the first one (subscription creation) and all subsequent renewals. We
    // need to credit the monthly plan quota on each cycle, NOT only on the
    // first one. Idempotency by `invoice.id`: each invoice triggers exactly
    // one grant, even if Stripe re-delivers the event.
    //
    // The activation case (first invoice) is also handled by
    // `creditBonusInitialIfPending` from `handleCheckoutCompleted`, which
    // uses a separate `bonus_grants/{subscriptionId}` marker. Both paths
    // call `setPlanQuotaAdmin` so the result is the same — the plan bucket
    // ends up with the cycle's allotment. The two markers (`bonus_grants`
    // by subscription, `monthly_grants` by invoice) coexist intentionally:
    // they represent different events even when temporally adjacent.
    await applyMonthlyQuotaIfPending(db, firebaseUID, invoice, subscription);

    console.log(`Payment succeeded for user ${firebaseUID}, invoice ${invoice.id}`);
}

/**
 * Resets the user's PLAN bucket to the plan's monthly quota for the given
 * billing cycle. Idempotent via a marker doc at
 * `users/{uid}/monthly_grants/{invoiceId}` — the same invoice never
 * triggers two grants (Stripe re-delivery, manual replays, etc.).
 *
 * Pack pages are untouched; only `processingBalance.plan*` fields move.
 * No rollover: any leftover plan pages from the prior cycle are
 * overwritten by the new SET.
 */
async function applyMonthlyQuotaIfPending(
    db: FirebaseFirestore.Firestore,
    firebaseUID: string,
    invoice: Stripe.Invoice,
    subscription: Stripe.Subscription,
) {
    const invoiceId = invoice.id;
    const grantRef = db
        .collection('users').doc(firebaseUID)
        .collection('monthly_grants').doc(invoiceId);

    const existing = await grantRef.get();
    if (existing.exists) {
        console.log(`[MonthlyQuota] invoice=${invoiceId} already applied for ${firebaseUID}; skipping`);
        return;
    }

    // Resolve plan id from the subscription's price (handles plan upgrades
    // mid-cycle: the new price drives the new quota immediately).
    const priceId = subscription.items.data[0]?.price?.id;
    if (!priceId) {
        console.warn(`[MonthlyQuota] subscription=${subscription.id} has no price id; skipping`);
        return;
    }
    const planId = await findPlanIdByPriceId(db, priceId);
    if (!planId) {
        console.warn(`[MonthlyQuota] no plan matches priceId=${priceId}; skipping`);
        return;
    }

    const planSnap = await db.collection('plans').doc(planId).get();
    const limits = planSnap.data()?.limits ?? {};
    const standardQuota = Math.max(0, Number(limits.standardPagesPerMonth) || 0);
    const premiumQuota = Math.max(0, Number(limits.premiumPagesPerMonth) || 0);
    const exegesisQuota = Math.max(0, Number(limits.exegesisUsdPerMonth) || 0);

    if (standardQuota === 0 && premiumQuota === 0 && exegesisQuota === 0) {
        // Free-tier subscription or unconfigured plan — nothing to credit.
        // Still write the marker so we don't re-evaluate on every replay.
        await grantRef.set({
            invoiceId,
            planId,
            standardQuota: 0,
            premiumQuota: 0,
            exegesisQuota: 0,
            note: 'no quota configured for this plan',
            grantedAt: FieldValue.serverTimestamp(),
        });
        return;
    }

    await setPlanQuotaAdmin(firebaseUID, 'standard', standardQuota);
    await setPlanQuotaAdmin(firebaseUID, 'premium', premiumQuota);
    // Exegesis bucket is USD, not pages. setExegesisPlanQuotaAdmin
    // unconditionally overwrites — same no-rollover semantics as the
    // page buckets. Skip the call when the plan doesn't include
    // exégesis (Free / Personal) so we don't reset a pack-only user
    // to 0 every cycle.
    if (exegesisQuota > 0) {
        await setExegesisPlanQuotaAdmin(firebaseUID, exegesisQuota);
    }
    await grantRef.set({
        invoiceId,
        planId,
        standardQuota,
        premiumQuota,
        exegesisQuota,
        billingReason: invoice.billing_reason ?? null,
        periodStart: invoice.period_start
            ? new Date(invoice.period_start * 1000)
            : null,
        periodEnd: invoice.period_end
            ? new Date(invoice.period_end * 1000)
            : null,
        grantedAt: FieldValue.serverTimestamp(),
    });

    console.log(
        `[MonthlyQuota] reset plan bucket for ${firebaseUID} to ${standardQuota} std + ${premiumQuota} prem + $${exegesisQuota} exégesis (plan=${planId}, invoice=${invoiceId}, reason=${invoice.billing_reason})`,
    );
}

/**
 * Server-side mirror of the web `fireExegesisPricingEvent` tracker.
 * Writes to `user_activities` with the same `feature_used` shape so
 * dashboards can union web + webhook events without two pipelines.
 * Fire-and-forget — telemetry failure must not block the Stripe ack.
 */
async function logExegesisPricingActivity(
    db: Firestore,
    userId: string,
    event: string,
    metadata: Record<string, unknown>,
) {
    try {
        const now = new Date();
        const activityId = `${userId}_${now.getTime()}_${event}`;
        await db.collection('user_activities').doc(activityId).set({
            userId,
            sessionId: `webhook_${now.getTime()}`,
            eventType: 'feature_used',
            metadata: { feature: 'exegesis_pricing', event, ...metadata },
            timestamp: FieldValue.serverTimestamp(),
            createdAt: FieldValue.serverTimestamp(),
        });
    } catch (err) {
        console.error('[logExegesisPricingActivity] failed:', err);
    }
}
