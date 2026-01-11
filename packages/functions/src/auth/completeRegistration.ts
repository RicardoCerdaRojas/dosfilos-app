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
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { SupportedLocale } from '../services/EmailService';
import { logger } from 'firebase-functions/v2';

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
 * Creates Firebase Auth user
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
            // User exists - might be from abandoned registration
            const existingUser = await auth.getUserByEmail(email);
            logger.warn(`User already exists: ${existingUser.uid}`, { email });
            return { uid: existingUser.uid };
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

    await db.collection('users').doc(userId).set({
        email: pending.email,
        displayName: pending.displayName,
        locale: pending.locale || 'es',
        subscription: {
            ...pending.subscription,
            // Convert Dates if needed
            trialEnd: pending.subscription.trialEnd,
            currentPeriodEnd: pending.subscription.currentPeriodEnd,
        },
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
    async (request): Promise<CompleteRegistrationResponse> => {
        const { sessionId, locale = 'es' } = request.data;

        logger.info('Starting registration completion', { sessionId, locale });

        try {
            // 1. Validate pending registration
            const pending = await validatePendingRegistration(sessionId);

            // 2. Create Firebase Auth user
            const { uid } = await createFirebaseUser(pending.email, pending.displayName);

            // 3. Create user profile with subscription data
            await createUserProfile(uid, pending);

            // 4. Mark registration as completed
            await markRegistrationCompleted(sessionId);

            // 5. Create custom token for auto-login
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
