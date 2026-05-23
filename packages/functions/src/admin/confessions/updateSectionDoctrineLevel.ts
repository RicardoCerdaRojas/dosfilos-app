import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { writeAuditLog } from '../auditLog';
import { appCheckCallableOptions } from '../../config/appCheckOptions';

const VALID_LEVELS = new Set(['core', 'distinctive', 'open-evangelical']);
const VALID_REVIEW_STATUS = new Set(['pending-pastoral-review', 'reviewed']);

/**
 * Cloud Function: Manually override a section's doctrineLevel.
 *
 * Two use cases:
 *   1. Ricardo reviewing LLM-proposed tags. Flips `reviewStatus` to
 *      `reviewed` while keeping or correcting the level.
 *   2. Ad-hoc reclassification (e.g. catalog hot-fix during a phase).
 *
 * Idempotent; audit-logged with the previous + new values so the trail
 * shows when a section drifted between levels and why.
 */
export const updateSectionDoctrineLevel = onCall(
    appCheckCallableOptions(),
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'User must be authenticated');
        }

        const db = admin.firestore();
        const callerUid = request.auth.uid;

        const callerDoc = await db.collection('users').doc(callerUid).get();
        if (!callerDoc.exists || callerDoc.data()?.role !== 'super_admin') {
            throw new HttpsError('permission-denied', 'Only super admins can override doctrine levels');
        }

        const { confessionId, sectionId, doctrineLevel, reviewStatus, levelRationale } = request.data ?? {};
        if (!confessionId || typeof confessionId !== 'string') {
            throw new HttpsError('invalid-argument', 'confessionId is required');
        }
        if (!sectionId || typeof sectionId !== 'string') {
            throw new HttpsError('invalid-argument', 'sectionId is required');
        }
        if (doctrineLevel !== undefined && !VALID_LEVELS.has(doctrineLevel)) {
            throw new HttpsError('invalid-argument', `Invalid doctrineLevel: ${doctrineLevel}`);
        }
        if (reviewStatus !== undefined && !VALID_REVIEW_STATUS.has(reviewStatus)) {
            throw new HttpsError('invalid-argument', `Invalid reviewStatus: ${reviewStatus}`);
        }

        const ref = db.collection('confessions').doc(confessionId).collection('sections').doc(sectionId);
        const snap = await ref.get();
        if (!snap.exists) {
            throw new HttpsError('not-found', `Section ${confessionId}/${sectionId} not found`);
        }

        const previous = snap.data()!;
        const update: Record<string, unknown> = {
            updatedAt: FieldValue.serverTimestamp(),
        };
        if (doctrineLevel !== undefined) update.doctrineLevel = doctrineLevel;
        if (reviewStatus !== undefined) update.reviewStatus = reviewStatus;
        if (levelRationale !== undefined) update.levelRationale = levelRationale;

        await ref.update(update);

        writeAuditLog({
            actorUid: callerUid,
            actorEmail: callerDoc.data()?.email,
            action: 'core_library.update_doctrine_level',
            details: {
                confessionId,
                sectionId,
                previous: {
                    doctrineLevel: previous.doctrineLevel ?? null,
                    reviewStatus: previous.reviewStatus ?? null,
                    levelRationale: previous.levelRationale ?? null,
                },
                applied: update,
            },
        });

        return { success: true };
    },
);
