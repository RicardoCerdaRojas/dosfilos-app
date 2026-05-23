import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { appCheckCallableOptions } from '../../config/appCheckOptions';

/**
 * Cloud Function: Lookup Bible cross-references for a verse or range.
 *
 * Two call shapes:
 *   - `{ book, chapter, verse }` → exact lookup, returns the doc's
 *     parallels (or empty array when the verse isn't indexed).
 *   - `{ book, chapter, startVerse, endVerse }` → pericope lookup,
 *     aggregates parallels across the range.
 *
 * Open to authenticated users (no super_admin gate) because Phase 2's
 * Testigo 2 orchestrator and the Phase 1 six-step spine consume this
 * from regular user sessions. Writes still flow through the ingest
 * callable only.
 */
export const lookupCrossReferences = onCall(
    appCheckCallableOptions(),
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'User must be authenticated');
        }

        const data = request.data ?? {};
        const book = String(data.book ?? '').toUpperCase();
        const chapter = Number(data.chapter);

        if (!book || !Number.isFinite(chapter)) {
            throw new HttpsError('invalid-argument', 'book + chapter are required');
        }

        const db = admin.firestore();
        const collection = db.collection('bibleCrossReferences');

        // Range lookup
        if (data.startVerse !== undefined && data.endVerse !== undefined) {
            const startVerse = Number(data.startVerse);
            const endVerse = Number(data.endVerse);
            if (!Number.isFinite(startVerse) || !Number.isFinite(endVerse) || startVerse > endVerse) {
                throw new HttpsError('invalid-argument', 'Invalid verse range');
            }
            const snap = await collection
                .where('sourceBook', '==', book)
                .where('sourceChapter', '==', chapter)
                .where('sourceVerse', '>=', startVerse)
                .where('sourceVerse', '<=', endVerse)
                .get();
            return {
                docs: snap.docs.map((d) => normalize(d.id, d.data())),
            };
        }

        // Single verse lookup
        const verse = Number(data.verse);
        if (!Number.isFinite(verse)) {
            throw new HttpsError('invalid-argument', 'verse is required for single lookup');
        }

        const ref = collection.doc(`${book}-${chapter}-${verse}`);
        const snap = await ref.get();
        if (!snap.exists) {
            return { doc: null };
        }
        return { doc: normalize(snap.id, snap.data()!) };
    },
);

function normalize(id: string, data: any) {
    return {
        id,
        sourceBook: data.sourceBook,
        sourceChapter: data.sourceChapter,
        sourceVerse: data.sourceVerse,
        parallels: Array.isArray(data.parallels) ? data.parallels : [],
        count: data.count ?? 0,
        source: data.source ?? 'unknown',
    };
}
