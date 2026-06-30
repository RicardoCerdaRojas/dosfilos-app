import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { writeAuditLog } from '../admin/auditLog';
import { appCheckCallableOptions } from '../config/appCheckOptions';

/**
 * ADR-036 — edición de una entrada del set crítico curado.
 *
 * Re-curar (corregir claim / ancla / pasaje). Cualquier cambio INVALIDA la
 * verificación previa: la entrada vuelve a `pending-pastoral-review` y se borra
 * `verification` (fail-closed: una entrada editada NO confronta hasta re-aprobar,
 * porque el ancla pudo cambiar). Role-gated igual que el ingest.
 *
 * functions NO importa @dosfilos/domain: shape espeja `VerifiedMisreading`.
 */

const VALID_SEVERITY = new Set(['critical', 'standard']);

function str(v: unknown): string {
    return String(v ?? '').trim();
}
function int(v: unknown): number {
    return Math.max(0, Math.round(Number(v ?? 0)) || 0);
}

interface AnchorInput {
    reference: string;
    note?: string;
    sourceId?: string;
}
function parseAnchors(raw: unknown): AnchorInput[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((a) => {
            const ref = str((a as Record<string, unknown>)?.reference);
            if (!ref) return null;
            const note = str((a as Record<string, unknown>)?.note);
            const sourceId = str((a as Record<string, unknown>)?.sourceId);
            return { reference: ref, ...(note ? { note } : {}), ...(sourceId ? { sourceId } : {}) } as AnchorInput;
        })
        .filter((a): a is AnchorInput => a !== null)
        .slice(0, 10);
}

export const updateVerifiedMisreading = onCall(
    appCheckCallableOptions(),
    async (request) => {
        if (!request.auth) throw new HttpsError('unauthenticated', 'User must be authenticated');
        const db = admin.firestore();
        const callerUid = request.auth.uid;

        const callerDoc = await db.collection('users').doc(callerUid).get();
        if (!callerDoc.exists || callerDoc.data()?.role !== 'super_admin') {
            throw new HttpsError('permission-denied', 'Only the floor reviewer can edit verified misreadings');
        }

        const data = request.data ?? {};
        const id = str(data.id);
        if (!id) throw new HttpsError('invalid-argument', 'id is required');

        const claim = str(data.claim);
        const whyWrong = str(data.whyWrong);
        const severity = str(data.severity);
        const scope = (data.passageScope ?? {}) as Record<string, unknown>;
        const passageScope = {
            bookId: str(scope.bookId),
            chapterStart: int(scope.chapterStart),
            verseStart: int(scope.verseStart),
            verseEnd: int(scope.verseEnd),
        };
        const correctiveAnchors = parseAnchors(data.correctiveAnchors);

        if (!claim) throw new HttpsError('invalid-argument', 'claim is required');
        if (!VALID_SEVERITY.has(severity)) throw new HttpsError('invalid-argument', `Invalid severity: ${severity}`);
        if (!passageScope.bookId) throw new HttpsError('invalid-argument', 'passageScope.bookId is required');
        if (correctiveAnchors.length === 0) throw new HttpsError('invalid-argument', 'at least one correctiveAnchor is required');

        const ref = db.collection('verifiedMisreadings').doc(id);
        const snap = await ref.get();
        if (!snap.exists) throw new HttpsError('not-found', `verifiedMisreading ${id} not found`);

        // Editar invalida la verificación previa → vuelve a la cola (fail-closed).
        await ref.update({
            claim,
            whyWrong,
            severity,
            passageScope,
            correctiveAnchors,
            reviewStatus: 'pending-pastoral-review',
            verification: FieldValue.delete(),
            reviewedBy: FieldValue.delete(),
            reviewedAt: FieldValue.delete(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        writeAuditLog({
            actorUid: callerUid,
            actorEmail: callerDoc.data()?.email,
            action: 'anchor_fidelity.update_misreading',
            details: { id, claim, severity, passageScope, anchorCount: correctiveAnchors.length },
        });

        return { id };
    },
);
