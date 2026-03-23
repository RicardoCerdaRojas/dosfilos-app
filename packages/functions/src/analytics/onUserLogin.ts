import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

/**
 * Cloud Function: On User Login
 *
 * Callable function to track user login events.
 * - Increments loginCount and updates lastLoginAt.
 * - Recalculates and persists engagementScore on every login.
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
            await userRef.set({
                email: request.auth.token.email,
                displayName: request.auth.token.name || null,
                createdAt: FieldValue.serverTimestamp(),
                analytics: {
                    loginCount: 1,
                    lastLoginAt: FieldValue.serverTimestamp(),
                    firstLoginAt: FieldValue.serverTimestamp(),
                    engagementScore: 5, // 1 login → loginFrequency starts at 5
                },
                updatedAt: FieldValue.serverTimestamp(),
            });
        } else {
            const userData = userDoc.data();
            const currentAnalytics = userData?.analytics || {};
            const newLoginCount = (currentAnalytics.loginCount || 0) + 1;
            const now = new Date();

            // Calculate updated engagement score with the new login count
            const engagementScore = computeEngagementScore({
                loginCount: newLoginCount,
                lastLoginAt: now,
                lastActivityAt: currentAnalytics.lastActivityAt?.toDate?.() ?? now,
                sermonsCreated: currentAnalytics.sermonsCreated || 0,
                greekTutorSessions: currentAnalytics.greekTutorSessions || 0,
            });

            await userRef.update({
                'analytics.loginCount': newLoginCount,
                'analytics.lastLoginAt': FieldValue.serverTimestamp(),
                'analytics.engagementScore': engagementScore,
                updatedAt: FieldValue.serverTimestamp(),
            });

            // Set firstLoginAt if it doesn't exist (for migrated users)
            if (!currentAnalytics.firstLoginAt) {
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

// ============================================================================
// Engagement Score — inline calculation (mirrors frontend engagementScore.ts)
// Kept inline to avoid cross-package import dependency.
// ============================================================================

interface AnalyticsSnapshot {
    loginCount: number;
    lastLoginAt: Date;
    lastActivityAt: Date;
    sermonsCreated: number;
    greekTutorSessions: number;
}

function computeEngagementScore(a: AnalyticsSnapshot): number {
    const total =
        loginFrequencyScore(a.loginCount) +
        recencyScore(a.lastActivityAt ?? a.lastLoginAt) +
        sermonScore(a.sermonsCreated) +
        greekScore(a.greekTutorSessions) +
        consistencyScore(a.loginCount, a.sermonsCreated);
    return Math.min(100, Math.max(0, Math.round(total)));
}

function loginFrequencyScore(count: number): number {
    if (count === 0) return 0;
    if (count < 5) return 5;
    if (count < 10) return 10;
    if (count < 20) return 15;
    if (count < 50) return 20;
    if (count < 100) return 25;
    return 30;
}

function recencyScore(lastDate: Date): number {
    const diffDays = (Date.now() - lastDate.getTime()) / 86_400_000;
    if (diffDays <= 1) return 20;
    if (diffDays <= 3) return 15;
    if (diffDays <= 7) return 10;
    if (diffDays <= 14) return 5;
    if (diffDays <= 30) return 2;
    return 0;
}

function sermonScore(count: number): number {
    if (count === 0) return 0;
    if (count === 1) return 10;
    if (count < 5) return 15;
    if (count < 10) return 20;
    if (count < 20) return 25;
    return 30;
}

function greekScore(count: number): number {
    if (count === 0) return 0;
    if (count === 1) return 3;
    if (count < 5) return 5;
    if (count < 10) return 7;
    return 10;
}

function consistencyScore(loginCount: number, sermonsCreated: number): number {
    if (loginCount >= 10 && sermonsCreated >= 5) return 10;
    if (loginCount >= 5 && sermonsCreated >= 3) return 7;
    if (loginCount >= 3 && sermonsCreated >= 1) return 5;
    return 0;
}
