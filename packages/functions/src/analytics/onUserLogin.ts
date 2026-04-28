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

            // Hebrew + Faculty have no analytics counter today, so query them
            // live. Two cheap reads on login is acceptable and removes the
            // dependency on counter-update plumbing we don't have yet.
            const [hebrewSessions, facultySessions] = await Promise.all([
                countWhere(db.collection('hebrew_user_sessions').where('userId', '==', userId)),
                countWhere(db.collection('users').doc(userId).collection('ai_sessions')),
            ]);

            // Calculate updated engagement score with the new login count
            const engagementScore = computeEngagementScore({
                loginCount: newLoginCount,
                lastLoginAt: now,
                lastActivityAt: currentAnalytics.lastActivityAt?.toDate?.() ?? now,
                sermonsCreated: currentAnalytics.sermonsCreated || 0,
                greekTutorSessions: currentAnalytics.greekTutorSessions || 0,
                hebrewSessions,
                facultySessions,
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
    hebrewSessions: number;
    facultySessions: number;
}

function computeEngagementScore(a: AnalyticsSnapshot): number {
    const total =
        loginFrequencyScore(a.loginCount) +
        recencyScore(a.lastActivityAt ?? a.lastLoginAt) +
        sermonScore(a.sermonsCreated) +
        greekScore(a.greekTutorSessions) +
        consistencyScore(a.loginCount, a.sermonsCreated) +
        breadthScore(a);
    return Math.min(100, Math.max(0, Math.round(total)));
}

/**
 * Breadth bonus — rewards users who explore multiple modules. Each feature
 * touched contributes 2.5pts up to 10. Keeps the score honest about
 * power-users who don't fit the "30 sermons" archetype but use Hebrew, Greek
 * and Faculty heavily.
 */
function breadthScore(a: AnalyticsSnapshot): number {
    let modulesUsed = 0;
    if (a.sermonsCreated > 0) modulesUsed++;
    if (a.greekTutorSessions > 0) modulesUsed++;
    if (a.hebrewSessions > 0) modulesUsed++;
    if (a.facultySessions > 0) modulesUsed++;
    return Math.min(10, modulesUsed * 2.5);
}

async function countWhere(q: FirebaseFirestore.Query): Promise<number> {
    try {
        const snap = await q.count().get();
        return snap.data().count;
    } catch {
        // Fallback for emulator or older SDK without aggregation.
        const snap = await q.get();
        return snap.size;
    }
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
