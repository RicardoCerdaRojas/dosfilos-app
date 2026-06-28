import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { writeAuditLog } from '../admin/auditLog';
import { appCheckCallableOptions } from '../config/appCheckOptions';

/**
 * ADR-036 PR4 — ingesta de una entrada del set crítico curado.
 *
 * Crea una entrada en `verifiedMisreadings/` en estado `pending-pastoral-review`.
 * NO verifica nada (eso es la revisión, PR4 `reviewVerifiedMisreading`): solo
 * persiste la lectura errónea + sus anclas correctivas crudas. Role-gated igual
 * que `updateSectionDoctrineLevel` (confesiones): super_admin como PLACEHOLDER
 * del rol `floor-reviewer` hasta que el fundador asigne la identidad real.
 *
 * functions NO importa @dosfilos/domain: el shape espeja `VerifiedMisreading` de
 * packages/domain/src/entities/VerifiedMisreading.ts. Mantener en sync.
 */

const SCHEMA_VERSION = 1;
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
            return {
                reference: ref,
                ...(note ? { note } : {}),
                ...(sourceId ? { sourceId } : {}),
            } as AnchorInput;
        })
        .filter((a): a is AnchorInput => a !== null)
        .slice(0, 10);
}

export const ingestVerifiedMisreading = onCall(
    appCheckCallableOptions(),
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'User must be authenticated');
        }
        const db = admin.firestore();
        const callerUid = request.auth.uid;

        const callerDoc = await db.collection('users').doc(callerUid).get();
        if (!callerDoc.exists || callerDoc.data()?.role !== 'super_admin') {
            throw new HttpsError('permission-denied', 'Only the floor reviewer can curate verified misreadings');
        }

        const data = request.data ?? {};
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
        if (correctiveAnchors.length === 0) {
            throw new HttpsError('invalid-argument', 'at least one correctiveAnchor is required');
        }

        const entry = {
            schemaVersion: SCHEMA_VERSION,
            passageScope,
            claim,
            whyWrong,
            severity,
            correctiveAnchors,
            reviewStatus: 'pending-pastoral-review' as const,
            createdAt: FieldValue.serverTimestamp(),
        };
        const ref = await db.collection('verifiedMisreadings').add(entry);

        writeAuditLog({
            actorUid: callerUid,
            actorEmail: callerDoc.data()?.email,
            action: 'anchor_fidelity.ingest_misreading',
            details: { id: ref.id, claim, severity, passageScope, anchorCount: correctiveAnchors.length },
        });

        return { id: ref.id };
    },
);
