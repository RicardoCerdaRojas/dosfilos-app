import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { writeAuditLog } from '../admin/auditLog';
import { appCheckCallableOptions } from '../config/appCheckOptions';

/**
 * ADR-036 — borra una entrada del set crítico curado. Role-gated. Para limpiar
 * entradas obsoletas o que quedaron `unclear` con un ancla flojo. Auditado.
 */

function str(v: unknown): string {
    return String(v ?? '').trim();
}

export const deleteVerifiedMisreading = onCall(
    appCheckCallableOptions(),
    async (request) => {
        if (!request.auth) throw new HttpsError('unauthenticated', 'User must be authenticated');
        const db = admin.firestore();
        const callerUid = request.auth.uid;

        const callerDoc = await db.collection('users').doc(callerUid).get();
        if (!callerDoc.exists || callerDoc.data()?.role !== 'super_admin') {
            throw new HttpsError('permission-denied', 'Only the floor reviewer can delete verified misreadings');
        }

        const id = str(request.data?.id);
        if (!id) throw new HttpsError('invalid-argument', 'id is required');

        const ref = db.collection('verifiedMisreadings').doc(id);
        const snap = await ref.get();
        if (!snap.exists) throw new HttpsError('not-found', `verifiedMisreading ${id} not found`);
        const claim = str(snap.data()?.claim);

        await ref.delete();

        writeAuditLog({
            actorUid: callerUid,
            actorEmail: callerDoc.data()?.email,
            action: 'anchor_fidelity.delete_misreading',
            details: { id, claim },
        });

        return { id };
    },
);
