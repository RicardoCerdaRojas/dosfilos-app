import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

interface TrackActivityData {
    eventType: 'page_view' | 'sermon_created' | 'sermon_edited' | 'feature_used' | 'export' | 'share';
    metadata?: Record<string, any>;
    sessionId?: string;
}

/**
 * Cloud Function: Track User Activity
 * 
 * Callable function to track user activity events from the frontend.
 * Updates user analytics and creates activity records.
 */
export const trackUserActivity = onCall<TrackActivityData>(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = request.auth.uid;
    const { eventType, metadata, sessionId } = request.data;

    if (!eventType) {
        throw new HttpsError('invalid-argument', 'eventType is required');
    }

    try {
        const db = getFirestore();
        const now = new Date();

        // Create activity event document
        const activityId = `${userId}_${now.getTime()}`;
        await db.collection('user_activities').doc(activityId).set({
            userId,
            sessionId: sessionId || `session_${now.getTime()}`,
            eventType,
            metadata: metadata || {},
            timestamp: FieldValue.serverTimestamp(),
            createdAt: FieldValue.serverTimestamp(),
        });

        // Update user's last activity timestamp
        await db.collection('users').doc(userId).update({
            'analytics.lastActivityAt': FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        // If it's a sermon created event, increment counter
        if (eventType === 'sermon_created') {
            await db.collection('users').doc(userId).update({
                'analytics.sermonsCreated': FieldValue.increment(1),
            });
        }

        console.log(`Activity tracked for user ${userId}: ${eventType}`);

        return {
            success: true,
            activityId,
        };
    } catch (error: any) {
        console.error('Error tracking activity:', error);
        throw new HttpsError('internal', error.message || 'Failed to track activity');
    }
});
