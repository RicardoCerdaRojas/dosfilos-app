/**
 * Complete Registration Cloud Function
 * 
 * Purpose: Create Firebase user AFTER successful Stripe payment
 * 
 * Flow:
 * 1. User pays via Stripe Checkout
 * 2. Webhook stores pending registration
 * 3. This function creates Firebase user
 * 4. Sends welcome + set password emails
 * 
 * SOLID Principles Applied:
 * - Single Responsibility: Only handles post-payment user creation
 * - Dependency Inversion: Uses EmailService abstraction
 * - Open/Closed: Easy to extend with new registration types
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { buildDefaultFeatureFlags } from './defaultFeatureFlags';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { SupportedLocale } from '../services/EmailService';
import { logger } from 'firebase-functions/v2';
import { appCheckCallableOptions } from '../config/appCheckOptions';
import { trackGeoEvent, getClientIP } from '../analytics/geoTracking';

// ============================================================================
// Domain Models
// ============================================================================

interface PendingRegistration {
    email: string;
    displayName: string;
    locale: SupportedLocale;
    paymentCompleted: boolean;
    subscription: {
        stripeSubscriptionId: string;
        stripeCustomerId: string;
        status: 'trialing' | 'active';
        planId: string;
        trialEnd?: Date;
        currentPeriodEnd: Date;
    };
    createdAt: Date;
    completedAt?: Date;
}

interface CompleteRegistrationRequest {
    sessionId: string; // Stripe checkout session ID
    locale?: SupportedLocale;
}

interface CompleteRegistrationResponse {
    success: boolean;
    userId: string;
    customToken: string;
    message: string;
}

// ============================================================================
// Helper Functions (Single Responsibility)
// ============================================================================

/**
 * Validates pending registration exists and payment completed
 */
async function validatePendingRegistration(
    sessionId: string
): Promise<PendingRegistration> {
    const db = getFirestore();
    const pendingRef = db.collection('pending_registrations').doc(sessionId);
    const pending = await pendingRef.get();

    if (!pending.exists) {
        throw new HttpsError(
            'not-found',
            'Registration not found. Please start the registration process again.'
        );
    }

    const data = pending.data() as PendingRegistration;

    if (!data.paymentCompleted) {
        throw new HttpsError(
            'failed-precondition',
            'Payment not completed. Please complete payment first.'
        );
    }

    if (data.completedAt) {
        throw new HttpsError(
            'already-exists',
            'Registration already completed. Please login instead.'
        );
    }

    return data;
}

/**
 * Creates Firebase Auth user. Throws with a clear code if the email is taken
 * (user hit checkout twice, or the email already belongs to another account).
 */
async function createFirebaseUser(
    email: string,
    displayName: string
): Promise<{ uid: string }> {
    const auth = getAuth();

    try {
        const user = await auth.createUser({
            email,
            displayName,
            emailVerified: true, // Skip email verification since they paid
        });

        logger.info(`Firebase user created: ${user.uid}`, { email, displayName });
        return { uid: user.uid };

    } catch (error: any) {
        if (error.code === 'auth/email-already-exists') {
            // Do NOT silently reuse the existing uid — that would let a second payment
            // overwrite the original user's Firestore profile.
            logger.warn('Registration attempt with existing email', { email });
            throw new HttpsError(
                'already-exists',
                'An account with this email already exists. Please log in instead.'
            );
        }
        throw error;
    }
}

/**
 * Creates user profile in Firestore
 */
async function createUserProfile(
    userId: string,
    pending: PendingRegistration
): Promise<void> {
    const db = getFirestore();

    // `preferredLanguage` is the canonical field consumed by the AI engine and
    // the web `useLanguageSync` listener. Kept alongside the legacy `locale` /
    // `settings.language` for compatibility with email/notification code paths
    // that haven't migrated yet.
    const preferredLanguage = pending.locale === 'en' ? 'en' : 'es';

    await db.collection('users').doc(userId).set({
        email: pending.email,
        displayName: pending.displayName,
        locale: pending.locale || 'es',
        preferredLanguage,
        subscription: {
            ...pending.subscription,
            // Convert Dates if needed
            trialEnd: pending.subscription.trialEnd,
            currentPeriodEnd: pending.subscription.currentPeriodEnd,
        },
        featureFlags: buildDefaultFeatureFlags(),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        onboardingCompleted: false,
        settings: {
            language: pending.locale || 'es',
            notifications: {
                email: true,
                trialReminders: true,
            },
        },
    });

    logger.info(`User profile created: ${userId}`, { email: pending.email });
}

/**
 * Credits the plan's `bonusInitial` to the new user's processing balance.
 * Idempotent via `users/{uid}/bonus_grants/{subscriptionId}` marker doc, so
 * the same subscription never grants twice.
 */
async function creditPlanBonusForNewUser(
    userId: string,
    pendingSubscription: PendingRegistration['subscription'],
): Promise<void> {
    const db = getFirestore();
    const planSnap = await db.collection('plans').doc(pendingSubscription.planId).get();
    if (!planSnap.exists) {
        logger.warn(`[BonusInitial] plan ${pendingSubscription.planId} not found; skipping bonus`);
        return;
    }
    const planData = planSnap.data();
    const bonus = planData?.bonusInitial ?? {};
    const standardPages = Math.max(0, Number(bonus.standardPages) || 0);
    const premiumPages = Math.max(0, Number(bonus.premiumPages) || 0);
    if (standardPages === 0 && premiumPages === 0) return;

    const grantRef = db
        .collection('users').doc(userId)
        .collection('bonus_grants').doc(pendingSubscription.stripeSubscriptionId);

    if ((await grantRef.get()).exists) {
        logger.info(`[BonusInitial] subscription=${pendingSubscription.stripeSubscriptionId} already granted; skipping`);
        return;
    }

    const userRef = db.collection('users').doc(userId);
    // Ensure the nested object exists for first-time users.
    await userRef.set(
        {
            processingBalance: {
                standardPagesAvailable: 0,
                premiumPagesAvailable: 0,
                standardSpentTotal: 0,
                premiumSpentTotal: 0,
            },
        },
        { merge: true },
    );

    const updates: Record<string, FirebaseFirestore.FieldValue> = {};
    if (standardPages > 0) {
        updates['processingBalance.standardPagesAvailable'] = FieldValue.increment(standardPages);
    }
    if (premiumPages > 0) {
        updates['processingBalance.premiumPagesAvailable'] = FieldValue.increment(premiumPages);
    }
    updates['processingBalance.updatedAt'] = FieldValue.serverTimestamp();
    await userRef.update(updates);

    await grantRef.set({
        subscriptionId: pendingSubscription.stripeSubscriptionId,
        standardPages,
        premiumPages,
        grantedAt: FieldValue.serverTimestamp(),
    });

    logger.info(
        `[BonusInitial] credited ${standardPages} standard + ${premiumPages} premium to ${userId} (subscription=${pendingSubscription.stripeSubscriptionId})`,
    );
}

/**
 * Marks pending registration as completed
 */
async function markRegistrationCompleted(sessionId: string): Promise<void> {
    const db = getFirestore();
    await db.collection('pending_registrations').doc(sessionId).update({
        completedAt: FieldValue.serverTimestamp(),
    });
}

// ============================================================================
// Main Cloud Function
// ============================================================================


export const completeRegistration = onCall<CompleteRegistrationRequest>(
    appCheckCallableOptions(),
    async (request): Promise<CompleteRegistrationResponse> => {
        const { sessionId, locale = 'es' } = request.data;

        logger.info('Starting registration completion', { sessionId, locale });

        // Track uid outside the try so a rollback can see it if a later step fails
        let createdUid: string | null = null;
        try {
            // 1. Validate pending registration
            const pending = await validatePendingRegistration(sessionId);

            // 2. Create Firebase Auth user
            const { uid } = await createFirebaseUser(pending.email, pending.displayName);
            createdUid = uid;

            // 3. Create user profile with subscription data
            //    If this throws, the catch block deletes the Auth user to avoid orphans.
            await createUserProfile(uid, pending);

            // 4. Credit the plan's bonusInitial (idempotent via subscription id).
            await creditPlanBonusForNewUser(uid, pending.subscription);

            // 5. Mark registration as completed
            await markRegistrationCompleted(sessionId);

            // 5. Track geographic registration event (non-blocking)
            trackGeoEvent({
                type: 'registration',
                userId: uid,
                ip: getClientIP(request.rawRequest),
                userAgent: request.rawRequest.headers['user-agent'] || 'Unknown',
            }).catch(geoErr =>
                logger.warn('Geo tracking failed (non-critical)', { error: String(geoErr) })
            );

            // 6. Create custom token for auto-login
            const auth = getAuth();
            const customToken = await auth.createCustomToken(uid);

            logger.info('Registration completed successfully', {
                userId: uid,
                email: pending.email,
            });

            return {
                success: true,
                userId: uid,
                customToken,
                message: locale === 'es'
                    ? 'Registro completado. ¡Bienvenido!'
                    : 'Registration completed. Welcome!',
            };

        } catch (error: any) {
            // If we created an Auth user but a later step failed, delete it to avoid
            // leaving a half-initialized account. The pending_registrations doc stays
            // intact (completedAt unset), so the user can safely retry.
            if (createdUid) {
                try {
                    await getAuth().deleteUser(createdUid);
                    logger.warn('Rolled back Auth user after failed registration', {
                        userId: createdUid,
                        sessionId,
                    });
                } catch (rollbackErr) {
                    logger.error('Rollback failed — orphaned Auth user remains', {
                        userId: createdUid,
                        sessionId,
                        rollbackError: String(rollbackErr),
                    });
                }
            }
            logger.error('Registration completion failed', {
                error: error.message,
                sessionId,
            });

            // Re-throw HttpsError as-is
            if (error instanceof HttpsError) {
                throw error;
            }

            // Wrap other errors
            throw new HttpsError(
                'internal',
                locale === 'es'
                    ? 'Error al completar el registro. Por favor contacta a soporte.'
                    : 'Error completing registration. Please contact support.',
                error.message
            );
        }
    }
);
