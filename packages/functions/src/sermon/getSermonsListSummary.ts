import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import type { Query } from 'firebase-admin/firestore';
import { appCheckCallableOptions } from '../config/appCheckOptions';

/**
 * Sermons dashboard — trimmed list read.
 *
 * A `sermons` doc carries `content`, the full `wizardProgress` (draft +
 * outline = generated prose), `citationManifest`, `studyDepthSnapshot`, and
 * `fidelityReport` — all heavy. The list (published + in-progress tabs) only
 * renders title/status/date/tags/category/series + a wizard-draft existence
 * check. The Firestore web SDK can't field-project, so `findByUserId` shipped
 * every full sermon to the browser to draw the list.
 *
 * This callable mirrors `findByUserId`'s query server-side (same
 * where/orderBy/limit → same existing indexes) and returns each sermon with
 * the heavy fields dropped. `wizardProgress` is reduced to `{ currentStep,
 * lastSaved }` so the list's "is this a wizard draft" check still works. The
 * full sermon loads via `getSermon` when one is opened.
 */

interface ListOptions {
    status?: string;
    category?: string;
    tags?: string[];
    orderBy?: string;
    order?: 'asc' | 'desc';
    limit?: number;
}

function toMillis(value: any): number | undefined {
    if (value === null || value === undefined) return undefined;
    if (value instanceof Timestamp) return value.toMillis();
    if (value?.toDate) return value.toDate().getTime();
    if (typeof value === 'number') return value;
    return undefined;
}

export const getSermonsListSummary = onCall(
    { ...appCheckCallableOptions() },
    async (request): Promise<{ sermons: any[] }> => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'User must be authenticated');
        }
        const userId = request.auth.uid;
        const opts = (request.data ?? {}) as ListOptions;

        const db = getFirestore();
        let q: Query = db.collection('sermons').where('userId', '==', userId);
        if (opts.status) q = q.where('status', '==', opts.status);
        if (opts.category) q = q.where('category', '==', opts.category);
        if (opts.tags && opts.tags.length > 0) q = q.where('tags', 'array-contains-any', opts.tags);
        q = q.orderBy(opts.orderBy ?? 'createdAt', opts.order ?? 'desc');
        if (opts.limit && opts.limit > 0) q = q.limit(opts.limit);

        const snapshot = await q.get();

        const sermons = snapshot.docs.map((doc) => {
            const d = doc.data() as any;
            const wp = d.wizardProgress;
            return {
                id: doc.id,
                userId: d.userId,
                title: d.title ?? '',
                status: d.status,
                bibleReferences: Array.isArray(d.bibleReferences) ? d.bibleReferences : [],
                tags: Array.isArray(d.tags) ? d.tags : [],
                category: d.category,
                createdAt: toMillis(d.createdAt),
                updatedAt: toMillis(d.updatedAt),
                publishedAt: toMillis(d.publishedAt),
                scheduledDate: toMillis(d.scheduledDate),
                seriesId: d.seriesId,
                projectId: d.projectId,
                sourceSermonId: d.sourceSermonId,
                sourceFacultySessionId: d.sourceFacultySessionId,
                sourcePaperId: d.sourcePaperId,
                authorName: d.authorName,
                isShared: d.isShared,
                shareToken: d.shareToken,
                // Existence + step preserved for the list's wizard-draft check
                // and any progress label; the heavy draft/outline are dropped.
                wizardProgress: wp
                    ? {
                          currentStep: typeof wp.currentStep === 'number' ? wp.currentStep : 0,
                          passage: typeof wp.passage === 'string' ? wp.passage : '',
                          lastSaved: toMillis(wp.lastSaved),
                      }
                    : undefined,
                // Dropped on purpose (not read by the list): content,
                // citationManifest, fidelityReport, studyDepthSnapshot,
                // bibliography, preachingHistory, wizardProgress.draft/outline.
            };
        });

        return { sermons };
    },
);
