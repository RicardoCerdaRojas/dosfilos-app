/**
 * Submit Cancellation Feedback Cloud Function
 * 
 * Purpose: Store user feedback when they cancel subscription
 * Helps improve product based on cancellation reasons
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';

interface CancellationFeedbackRequest {
    reason: string;
    comments?: string;
    timestamp: string;
}

interface CancellationFeedbackResponse {
    success: boolean;
    message: string;
}

export const submitCancellationFeedback = onCall<CancellationFeedbackRequest>(
    async (request): Promise<CancellationFeedbackResponse> => {
        // Verify authentication
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'User must be authenticated');
        }

        const userId = request.auth.uid;
        const { reason, comments, timestamp } = request.data;

        if (!reason) {
            throw new HttpsError('invalid-argument', 'Reason is required');
        }

        const db = getFirestore();

        try {
            // Get user email for context
            const userDoc = await db.collection('users').doc(userId).get();
            const userEmail = userDoc.exists ? userDoc.data()?.email : null;

            // Store feedback
            await db.collection('cancellation_feedback').add({
                userId,
                userEmail,
                reason,
                comments: comments || null,
                submittedAt: FieldValue.serverTimestamp(),
                clientTimestamp: timestamp,
            });

            logger.info('Cancellation feedback submitted', {
                userId,
                reason,
                hasComments: !!comments,
            });

            return {
                success: true,
                message: 'Feedback submitted successfully',
            };

        } catch (error: any) {
            logger.error('Error submitting cancellation feedback', {
                userId,
                error: error.message,
            });

            throw new HttpsError(
                'internal',
                'Error al guardar feedback',
                error.message
            );
        }
    }
);
