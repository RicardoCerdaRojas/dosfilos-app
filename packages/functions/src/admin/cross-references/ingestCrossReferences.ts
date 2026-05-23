import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import tskSample from './data/tsk-sample.json';
import { writeAuditLog } from '../auditLog';
import { appCheckCallableOptions } from '../../config/appCheckOptions';

interface SeedEntry {
    sourceBook: string;
    sourceChapter: number;
    sourceVerse: number;
    parallels: Array<{
        targetBook: string;
        targetChapter: number;
        targetVerse: number;
        targetVerseEnd?: number;
        type: 'quotation' | 'allusion' | 'parallel' | 'echo';
        strength: number;
        note?: string;
    }>;
}

interface SeedFile {
    source: string;
    description: string;
    entries: SeedEntry[];
}

/**
 * Cloud Function: Ingest Bible cross-references (TSK-derived).
 *
 * Phase 0 ships the hand-curated `tsk-sample.json` seed (~12 anchor
 * verses) so the lookup endpoint + admin tester have something real to
 * return on the first deploy. The full TSK dataset (~340k links) lands
 * in a follow-up callable that streams from the openbible.info CSV — out
 * of scope for PR 0.5.
 *
 * Idempotent: each entry overwrites its `/bibleCrossReferences/{id}`
 * doc, so re-running the callable refreshes counts and `updatedAt`
 * without stale duplicates.
 */
export const ingestBibleCrossReferences = onCall(
    { ...appCheckCallableOptions(), timeoutSeconds: 540 },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'User must be authenticated');
        }

        const db = admin.firestore();
        const callerUid = request.auth.uid;

        const callerDoc = await db.collection('users').doc(callerUid).get();
        if (!callerDoc.exists || callerDoc.data()?.role !== 'super_admin') {
            throw new HttpsError(
                'permission-denied',
                'Only super admins can ingest cross-references',
            );
        }

        const seed = tskSample as unknown as SeedFile;
        const collection = db.collection('bibleCrossReferences');

        const batch = db.batch();
        let written = 0;

        for (const entry of seed.entries) {
            const docId = `${entry.sourceBook}-${entry.sourceChapter}-${entry.sourceVerse}`;
            const ref = collection.doc(docId);
            batch.set(ref, {
                sourceBook: entry.sourceBook,
                sourceChapter: entry.sourceChapter,
                sourceVerse: entry.sourceVerse,
                parallels: entry.parallels,
                count: entry.parallels.length,
                source: seed.source,
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            });
            written += 1;
        }

        await batch.commit();

        writeAuditLog({
            actorUid: callerUid,
            actorEmail: callerDoc.data()?.email,
            action: 'cross_references.ingest',
            details: { source: seed.source, written },
        });

        return { success: true, source: seed.source, written };
    },
);
