import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

/**
 * Cloud Function: On User Login
 * 
 * Callable function to track user login events.
 * Should be called from the frontend after successful authentication.
 */
export const onUserLogin = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = request.auth.uid;

    try {
        const db = getFirestore();
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            console.warn(`User document not found for ${userId}, creating...`);
            // Create basic user document if it doesn't exist
            await userRef.set({
                email: request.auth.token.email,
                displayName: request.auth.token.name || null,
                createdAt: FieldValue.serverTimestamp(),
                analytics: {
                    loginCount: 1,
                    lastLoginAt: FieldValue.serverTimestamp(),
                    firstLoginAt: FieldValue.serverTimestamp(),
                    engagementScore: 0,
                },
                updatedAt: FieldValue.serverTimestamp(),
            });
        } else {
            // Update existing user's login analytics
            const userData = userDoc.data();
            const currentLoginCount = userData?.analytics?.loginCount || 0;

            await userRef.update({
                'analytics.loginCount': currentLoginCount + 1,
                'analytics.lastLoginAt': FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            });

            // Set firstLoginAt if it doesn't exist (for migrated users)
            if (!userData?.analytics?.firstLoginAt) {
                await userRef.update({
                    'analytics.firstLoginAt': FieldValue.serverTimestamp(),
                });
            }
        }

        console.log(`User login tracked for ${userId}`);

        return {
            success: true,
            timestamp: new Date().toISOString(),
        };
    } catch (error: any) {
        console.error('Error tracking login:', error);
        throw new HttpsError('internal', error.message || 'Failed to track login');
    }
});
