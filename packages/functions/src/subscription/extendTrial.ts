/**
 * Extend Trial Cloud Function
 * 
 * Purpose: Extends trial period by 7 days when user accepts retention offer
 * 
 * SOLID Principles:
 * - Single Responsibility: Only handles trial extension
 * - Interface Segregation: Clean, focused API
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { stripe } from '../config/stripe';
import { logger } from 'firebase-functions/v2';

interface ExtendTrialRequest {
    // No params needed - uses authenticated user
}

interface ExtendTrialResponse {
    success: boolean;
    newTrialEnd: string;
    message: string;
}

export const extendTrial = onCall<ExtendTrialRequest>(
    async (request): Promise<ExtendTrialResponse> => {
        // Verify authentication
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'User must be authenticated');
        }

        const userId = request.auth.uid;
        const db = getFirestore();

        try {
            // Get user subscription data
            const userRef = db.collection('users').doc(userId);
            const userDoc = await userRef.get();

            if (!userDoc.exists) {
                throw new HttpsError('not-found', 'User not found');
            }

            const userData = userDoc.data()!;
            const subscription = userData.subscription;

            if (!subscription || !subscription.id) {
                throw new HttpsError('failed-precondition', 'No active subscription found');
            }

            // Verify user is in trial
            if (subscription.status !== 'trialing') {
                throw new HttpsError(
                    'failed-precondition',
                    'Trial extension only available during trial period'
                );
            }

            // Check if already extended
            if (subscription.trialExtended) {
                throw new HttpsError(
                    'already-exists',
                    'Trial has already been extended'
                );
            }

            // Get current subscription from Stripe
            const stripeSubscription = await stripe.subscriptions.retrieve(subscription.id);

            if (!stripeSubscription.trial_end) {
                throw new HttpsError(
                    'failed-precondition',
                    'Subscription does not have a trial period'
                );
            }

            // Calculate new trial end date (7 days from current)
            const currentTrialEnd = new Date(stripeSubscription.trial_end * 1000);
            const newTrialEnd = new Date(currentTrialEnd);
            newTrialEnd.setDate(newTrialEnd.getDate() + 7);
            const newTrialEndTimestamp = Math.floor(newTrialEnd.getTime() / 1000);

            // Update subscription in Stripe
            await stripe.subscriptions.update(subscription.id, {
                trial_end: newTrialEndTimestamp,
                proration_behavior: 'none',
            });

            // Update user document
            await userRef.update({
                'subscription.trialEnd': newTrialEnd,
                'subscription.trialExtended': true,
                'subscription.trialExtendedAt': FieldValue.serverTimestamp(),
                'subscription.updatedAt': FieldValue.serverTimestamp(),
            });

            logger.info('Trial extended successfully', {
                userId,
                subscriptionId: subscription.id,
                originalTrialEnd: currentTrialEnd.toISOString(),
                newTrialEnd: newTrialEnd.toISOString(),
            });

            return {
                success: true,
                newTrialEnd: newTrialEnd.toISOString(),
                message: '¡Trial extendido por 7 días más!',
            };

        } catch (error: any) {
            logger.error('Error extending trial', {
                userId,
                error: error.message,
            });

            // Re-throw HttpsError as-is
            if (error instanceof HttpsError) {
                throw error;
            }

            // Wrap other errors
            throw new HttpsError(
                'internal',
                'Error al extender el trial. Por favor contacta a soporte.',
                error.message
            );
        }
    }
);
