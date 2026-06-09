import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { writeAuditLog } from './auditLog';
import { appCheckCallableOptions } from '../config/appCheckOptions';

interface StopImpersonatingResponse {
    customToken: string;
    adminUid: string;
}

/**
 * Cloud Function: end an impersonation session and return to the admin.
 *
 * Called from the impersonated session itself. Authorization is proven by the
 * `impersonatorUid` claim that `impersonateUser` baked into this session's
 * token — only a genuinely-impersonated session carries it, so no plain user
 * can mint themselves an admin token here.
 *
 * Re-checks that the original impersonator is STILL a super_admin before
 * handing back a token (role could have been revoked mid-session).
 */
export const stopImpersonating = onCall(
    appCheckCallableOptions(),
    async (request): Promise<StopImpersonatingResponse> => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'User must be authenticated');
        }

        const impersonatorUid = request.auth.token?.impersonatorUid as string | undefined;
        if (!impersonatorUid) {
            throw new HttpsError(
                'failed-precondition',
                'This session is not an impersonation session',
            );
        }

        const db = admin.firestore();
        const adminDoc = await db.collection('users').doc(impersonatorUid).get();
        if (!adminDoc.exists || adminDoc.data()?.role !== 'super_admin') {
            throw new HttpsError('permission-denied', 'Original admin is no longer a super admin');
        }

        // Plain token (no impersonation claims) → back to a normal admin session.
        const customToken = await admin.auth().createCustomToken(impersonatorUid);

        writeAuditLog({
            actorUid: impersonatorUid,
            actorEmail: adminDoc.data()?.email,
            action: 'user.stop_impersonate',
            targetUid: request.auth.uid,
            details: {},
        });

        return { customToken, adminUid: impersonatorUid };
    },
);
