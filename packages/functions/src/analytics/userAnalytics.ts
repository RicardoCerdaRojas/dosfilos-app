import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

const db = admin.firestore();

/**
 * Helper to get today's date string in YYYY-MM-DD format
 */
function getTodayString(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Initialize user_analytics when a new user is created
 */
export const onUserCreated = functions.firestore
    .document('users/{userId}')
    .onCreate(async (snap, context) => {
        const user = snap.data();
        const batch = db.batch();
        const userId = context.params.userId;
        const today = getTodayString();

        console.log(`Initializing analytics for new user: ${userId}`);

        // Create user_analytics document
        const userAnalyticsRef = db.doc(`user_analytics/${userId}`);
        batch.set(userAnalyticsRef, {
            userId,
            sermons: {
                total: 0,
                published: 0,
                drafts: 0,
                lastCreated: null,
            },
            greekSessions: {
                total: 0,
                completed: 0,
                lastSession: null,
            },
            series: {
                total: 0,
                lastCreated: null,
            },
            preachingPlans: {
                total: 0,
                lastCreated: null,
            },
            logins: {
                total: 0,
                lastLogin: null,
                streak: 0,
            },
            last30Days: {
                sermons: 0,
                greekSessions: 0,
                logins: 0,
            },
            updatedAt: FieldValue.serverTimestamp(),
            version: 1,
        });

        // Update daily global metrics
        const dailyRef = db.doc(`global_metrics/daily/${today}`);
        batch.set(dailyRef, {
            date: today,
            users: {
                new: FieldValue.increment(1),
                total: FieldValue.increment(1),
                byPlan: {
                    [user.subscription?.planId || 'free']: FieldValue.increment(1),
                },
            },
            updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });

        // Update aggregate
        const aggregateRef = db.doc('global_metrics/aggregate');
        batch.set(aggregateRef, {
            allTime: {
                users: FieldValue.increment(1),
            },
            lastUpdated: FieldValue.serverTimestamp(),
        }, { merge: true });

        await batch.commit();
        console.log(`✓ User analytics initialized for ${userId}`);
    });

/**
 * Track user login activity
 * Triggered by user_activities collection
 */
export const onUserActivity = functions.firestore
    .document('user_activities/{activityId}')
    .onCreate(async (snap, context) => {
        const activity = snap.data();

        // Only track login events
        if (activity.type !== 'login') {
            return;
        }

        const batch = db.batch();
        const userId = activity.userId;
        const today = getTodayString();

        console.log(`Tracking login for user: ${userId}`);

        // Update user analytics
        const userAnalyticsRef = db.doc(`user_analytics/${userId}`);
        batch.set(userAnalyticsRef, {
            logins: {
                total: FieldValue.increment(1),
                lastLogin: activity.timestamp,
            },
            updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });

        // Update daily metrics
        const dailyRef = db.doc(`global_metrics/daily/${today}`);
        batch.set(dailyRef, {
            totalLogins: FieldValue.increment(1),
            updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });

        await batch.commit();
        console.log(`✓ Login tracked for ${userId}`);
    });

/**
 * Cleanup analytics when a user is deleted
 */
export const onUserDeleted = functions.firestore
    .document('users/{userId}')
    .onDelete(async (snap, context) => {
        const userId = context.params.userId;

        console.log(`Cleaning up analytics for deleted user: ${userId}`);

        // Delete user_analytics document
        await db.doc(`user_analytics/${userId}`).delete();

        // Note: We don't decrement global metrics on user deletion
        // to maintain historical accuracy

        console.log(`✓ Analytics cleaned up for ${userId}`);
    });
