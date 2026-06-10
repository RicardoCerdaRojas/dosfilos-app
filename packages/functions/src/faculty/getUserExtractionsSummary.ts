import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { appCheckCallableOptions } from '../config/appCheckOptions';

/**
 * Faculty library — trimmed cross-session extraction list read.
 *
 * Each `extractions/` doc carries `markdown` — the full artifact body, the
 * dominant payload (a sermon/paper can be tens of KB). The cross-session
 * library list (`/dashboard/faculty/library`) only renders title/type/date +
 * project chips; the body is read only when an artifact is opened in the
 * editor. The Firestore web SDK can't field-project, so `listByUser` shipped
 * every full markdown body to the browser just to draw the list.
 *
 * This callable mirrors `listByUser`'s query server-side (Admin SDK) and
 * returns each extraction WITH `markdown` dropped to `''`. The full body is
 * fetched per-artifact via `getById` when one is selected in the editor.
 *
 * Ordering: createdAt DESC. The `(userId asc, createdAt desc)` composite
 * index already exists (used by `listByUser`'s identical query). Capped at
 * MAX_EXTRACTIONS; trimmed docs are tiny so the cap is a safety bound, not a
 * UX limit. Truncation is logged.
 */

const MAX_EXTRACTIONS = 500;

interface SummaryExtraction {
    id: string;
    userId: string;
    sessionId: string | null;
    projectIds: string[];
    type: string;
    title: string;
    markdown: '';
    createdAt: number;
    updatedAt: number;
    derivedFromMessageIds: string[];
    externalRef: { collection: string; id: string } | null;
    version: number;
    sourceSessionDeleted: boolean;
    publishedRefs: Array<{
        platform: string;
        externalId: string;
        externalUrl: string;
        status: string;
        publishedAt: number;
    }>;
}

function toMillis(value: any): number {
    if (value instanceof Timestamp) return value.toMillis();
    if (value?.toDate) return value.toDate().getTime();
    if (typeof value === 'number') return value;
    return Date.now();
}

export const getUserExtractionsSummary = onCall(
    { ...appCheckCallableOptions() },
    async (request): Promise<{ extractions: SummaryExtraction[]; truncated: boolean }> => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'User must be authenticated');
        }
        const userId = request.auth.uid;

        const db = getFirestore();
        const snapshot = await db
            .collection('extractions')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(MAX_EXTRACTIONS + 1)
            .get();

        const docs = snapshot.docs;
        const truncated = docs.length > MAX_EXTRACTIONS;
        if (truncated) {
            console.warn(
                `[getUserExtractionsSummary] user ${userId} has >${MAX_EXTRACTIONS} extractions; list truncated`,
            );
        }
        const pageDocs = truncated ? docs.slice(0, MAX_EXTRACTIONS) : docs;

        const extractions: SummaryExtraction[] = pageDocs.map((doc) => {
            const d = doc.data() as any;
            // Mirror the web repo's fromFirestore coercions so the trimmed
            // payload deserializes into the same Extraction shape.
            const projectIds: string[] = Array.isArray(d.projectIds)
                ? d.projectIds
                : d.projectId
                  ? [d.projectId]
                  : [];
            const publishedRefs = Array.isArray(d.publishedRefs)
                ? d.publishedRefs.map((r: any) => ({
                      platform: r.platform,
                      externalId: r.externalId,
                      externalUrl: r.externalUrl,
                      status: r.status,
                      publishedAt: toMillis(r.publishedAt),
                  }))
                : [];
            return {
                id: doc.id,
                userId: d.userId,
                sessionId: d.sessionId ?? null,
                projectIds,
                type: d.type,
                title: d.title ?? '',
                // Dropped on purpose — the dominant payload. The list never
                // renders it; the editor fetches the full doc via getById.
                markdown: '',
                createdAt: toMillis(d.createdAt),
                updatedAt: toMillis(d.updatedAt),
                derivedFromMessageIds: Array.isArray(d.derivedFromMessageIds) ? d.derivedFromMessageIds : [],
                externalRef: d.externalRef ?? null,
                version: typeof d.version === 'number' ? d.version : 1,
                sourceSessionDeleted: d.sourceSessionDeleted ?? false,
                publishedRefs,
            };
        });

        return { extractions, truncated };
    },
);
