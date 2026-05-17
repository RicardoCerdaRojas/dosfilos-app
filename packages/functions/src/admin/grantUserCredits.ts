import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { writeAuditLog } from './auditLog';
import { appCheckCallableOptions } from '../config/appCheckOptions';

interface GrantUserCreditsRequest {
    userId: string;
    standardPages?: number;
    premiumPages?: number;
    reason: string;
}

/**
 * Cloud Function: Admin grants processing credits to a user.
 *
 * Two common use cases:
 *   1. Bug compensation — extraction failed mid-flight and consumed pages
 *      that the user shouldn't have lost.
 *   2. Sales / partnership — comp credits for a launch promotion or beta tester.
 *
 * The grant is additive (uses `FieldValue.increment`) so it composes safely
 * with the user's normal balance and other admin grants. A `reason` is
 * required and written to the audit log for compliance.
 *
 * Negative values (deductions) are NOT allowed via this function — that's
 * disable + manual cleanup territory.
 */
export const grantUserCredits = onCall<GrantUserCreditsRequest>(appCheckCallableOptions(), async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const callerUid = request.auth.uid;
    const db = admin.firestore();

    const callerDoc = await db.collection('users').doc(callerUid).get();
    if (!callerDoc.exists || callerDoc.data()?.role !== 'super_admin') {
        throw new HttpsError('permission-denied', 'Only super admins can grant credits');
    }

    const { userId, standardPages = 0, premiumPages = 0, reason } = request.data ?? ({} as GrantUserCreditsRequest);
    if (!userId || !reason?.trim()) {
        throw new HttpsError('invalid-argument', 'userId and reason are required');
    }
    if (standardPages < 0 || premiumPages < 0) {
        throw new HttpsError('invalid-argument', 'Negative grants are not allowed');
    }
    if (standardPages === 0 && premiumPages === 0) {
        throw new HttpsError('invalid-argument', 'At least one of standardPages or premiumPages must be > 0');
    }

    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
        throw new HttpsError('not-found', `User ${userId} not found`);
    }
    const userData = userDoc.data()!;

    // Initialise the nested object for first-time grants on free users.
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

    writeAuditLog({
        actorUid: callerUid,
        actorEmail: callerDoc.data()?.email,
        action: 'user.grant_credits',
        targetUid: userId,
        targetEmail: userData.email,
        details: {
            standardPages,
            premiumPages,
            reason,
        },
    });

    return { success: true, standardPages, premiumPages };
});
