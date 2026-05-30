import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { writeAuditLog } from './auditLog';
import { appCheckCallableOptions } from '../config/appCheckOptions';

const ALLOWED_FLAGS = new Set<string>([
    'pastoral_fidelity_flow',
    'pastoral_word_study',
    'three_witnesses',
    'study_depth',
    'fidelity_pass',
]);

/**
 * Cloud Function: Set User Feature Flags
 *
 * Super-admin-only mutation of a user's `featureFlags` map. Mirrors the
 * disable/enable pattern: validate caller role, sanitize input, write to
 * Firestore, append an audit-log entry. Used by the admin Feature Flags
 * tab to gate Pastoral Fidelity rollout per-user.
 *
 * Accepts a partial map so flags can be toggled individually. Unknown flag
 * keys are rejected so a typo doesn't silently land a phantom flag in the
 * document.
 */
export const setUserFeatureFlags = onCall(
    appCheckCallableOptions(),
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'User must be authenticated');
        }

        const callerUid = request.auth.uid;
        const db = admin.firestore();

        const callerDoc = await db.collection('users').doc(callerUid).get();
        if (!callerDoc.exists || callerDoc.data()?.role !== 'super_admin') {
            throw new HttpsError('permission-denied', 'Only super admins can set feature flags');
        }

        const { userId, flags } = request.data ?? {};
        if (!userId || typeof userId !== 'string') {
            throw new HttpsError('invalid-argument', 'Target userId is required');
        }
        if (!flags || typeof flags !== 'object' || Array.isArray(flags)) {
            throw new HttpsError('invalid-argument', 'flags must be an object of {flagName: boolean}');
        }

        const sanitized: Record<string, boolean> = {};
        for (const [key, value] of Object.entries(flags)) {
            if (!ALLOWED_FLAGS.has(key)) {
                throw new HttpsError('invalid-argument', `Unknown feature flag: ${key}`);
            }
            if (typeof value !== 'boolean') {
                throw new HttpsError('invalid-argument', `Flag ${key} must be boolean`);
            }
            sanitized[key] = value;
        }

        try {
            const userRef = db.collection('users').doc(userId);
            const userDoc = await userRef.get();
            if (!userDoc.exists) {
                throw new HttpsError('not-found', `User ${userId} not found`);
            }

            const userData = userDoc.data()!;
            const previous = (userData.featureFlags ?? {}) as Record<string, boolean>;
            const next = { ...previous, ...sanitized };

            await userRef.update({
                featureFlags: next,
                updatedAt: FieldValue.serverTimestamp(),
            });

            writeAuditLog({
                actorUid: callerUid,
                actorEmail: callerDoc.data()?.email,
                action: 'user.set_feature_flags',
                targetUid: userId,
                targetEmail: userData.email,
                details: { previous, applied: sanitized, next },
            });

            return { success: true, flags: next };
        } catch (error: any) {
            if (error instanceof HttpsError) throw error;
            console.error('Error setting feature flags:', error);
            throw new HttpsError('internal', error.message || 'Failed to set feature flags');
        }
    },
);
