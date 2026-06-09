import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { writeAuditLog } from './auditLog';
import { appCheckCallableOptions } from '../config/appCheckOptions';

interface ImpersonateUserRequest {
    userId: string;
}

interface ImpersonateUserResponse {
    customToken: string;
    targetUid: string;
    targetEmail: string | null;
    targetName: string | null;
}

/**
 * Cloud Function: Admin "log in as user" (impersonation).
 *
 * A super admin gets a Firebase custom token for the target user so the web
 * client can `signInWithCustomToken` and browse the app exactly as that user
 * sees it (support / debugging / ambassador setup verification).
 *
 * The minted token carries `impersonatorUid` / `impersonatorEmail` as
 * additional claims. Those claims:
 *   - survive ID-token refresh for the session, so the UI can keep showing a
 *     "you are impersonating X" banner;
 *   - are the proof `stopImpersonating` checks before minting a token back to
 *     the admin (you can only return if you actually started an impersonation).
 *
 * Guards:
 *   - caller must be `super_admin`;
 *   - cannot impersonate yourself (pointless) — keeps the audit trail honest;
 *   - cannot impersonate another `super_admin` (prevents lateral takeover of a
 *     peer admin's session).
 *
 * NOTE: the impersonated session is a FULL session — it can do anything the
 * user can (by product decision). The `impersonatorUid` claim is the audit
 * anchor; every action taken is still attributable via this log entry.
 */
export const impersonateUser = onCall<ImpersonateUserRequest>(
    appCheckCallableOptions(),
    async (request): Promise<ImpersonateUserResponse> => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'User must be authenticated');
        }

        const callerUid = request.auth.uid;
        const db = admin.firestore();

        const callerDoc = await db.collection('users').doc(callerUid).get();
        if (!callerDoc.exists || callerDoc.data()?.role !== 'super_admin') {
            throw new HttpsError('permission-denied', 'Only super admins can impersonate users');
        }

        const { userId } = request.data ?? ({} as ImpersonateUserRequest);
        if (!userId) {
            throw new HttpsError('invalid-argument', 'Target userId is required');
        }
        if (userId === callerUid) {
            throw new HttpsError('invalid-argument', 'Cannot impersonate your own account');
        }

        const targetDoc = await db.collection('users').doc(userId).get();
        if (!targetDoc.exists) {
            throw new HttpsError('not-found', `User ${userId} not found`);
        }
        const targetData = targetDoc.data()!;
        if (targetData.role === 'super_admin') {
            throw new HttpsError('permission-denied', 'Cannot impersonate another super admin');
        }

        const callerEmail = callerDoc.data()?.email ?? null;

        // Additional claims ride along in the session's ID token (and survive
        // refresh). Keep them small — custom claims cap at ~1000 bytes.
        const customToken = await admin.auth().createCustomToken(userId, {
            impersonatorUid: callerUid,
            impersonatorEmail: callerEmail,
        });

        writeAuditLog({
            actorUid: callerUid,
            actorEmail: callerEmail ?? undefined,
            action: 'user.impersonate',
            targetUid: userId,
            targetEmail: targetData.email,
            details: { targetPlan: targetData.subscription?.planId ?? null },
        });

        return {
            customToken,
            targetUid: userId,
            targetEmail: targetData.email ?? null,
            targetName: targetData.displayName ?? null,
        };
    },
);
