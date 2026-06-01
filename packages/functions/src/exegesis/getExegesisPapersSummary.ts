import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { appCheckCallableOptions } from '../config/appCheckOptions';

/**
 * Exegesis dashboard — trimmed paper-list read.
 *
 * An `exegetical_papers` doc is the largest in the app: `steps[].versions[]`
 * (append-only markdown history), `assembledMarkdown`, `sources[]`, rubric +
 * plan. The list only renders title/passage/phase/date + three counts
 * (steps, accepted steps, sources). The Firestore web SDK can't field-project,
 * so the old `listPapers` shipped every full paper to the browser.
 *
 * This callable reads server-side (Admin SDK), computes the counts, and drops
 * the heavy fields. The full paper is fetched via `getPaper` only when opened.
 *
 * No orderBy (single `where ownerId` — no composite index needed); the client
 * sorts by `updatedAt`. Archived papers are included; the list filters them.
 */

interface PaperSummary {
    id: string;
    title?: string;
    passage: unknown;
    displayLanguage: 'es' | 'en';
    phase: string;
    archivedAt: number | null;
    createdAt: number;
    updatedAt: number;
    assignmentBrief: string | null;
    stepCount: number;
    acceptedStepCount: number;
    sourceCount: number;
}

function toMillis(value: any): number {
    if (value instanceof Timestamp) return value.toMillis();
    if (value?.toDate) return value.toDate().getTime();
    if (typeof value === 'number') return value;
    return Date.now();
}

function toMillisOrNull(value: any): number | null {
    if (value === null || value === undefined) return null;
    return toMillis(value);
}

export const getExegesisPapersSummary = onCall(
    { ...appCheckCallableOptions() },
    async (request): Promise<{ papers: PaperSummary[] }> => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'User must be authenticated');
        }
        const ownerId = request.auth.uid;

        const db = getFirestore();
        const snapshot = await db
            .collection('exegeticalPapers')
            .where('ownerId', '==', ownerId)
            .get();

        const papers: PaperSummary[] = snapshot.docs.map((doc) => {
            const d = doc.data() as any;
            const steps = Array.isArray(d.steps) ? d.steps : [];
            const sources = Array.isArray(d.sources) ? d.sources : [];
            return {
                id: doc.id,
                title: d.title,
                passage: d.passage,
                displayLanguage: d.displayLanguage === 'en' ? 'en' : 'es',
                phase: d.phase ?? 'configuring',
                archivedAt: toMillisOrNull(d.archivedAt),
                createdAt: toMillis(d.createdAt),
                updatedAt: toMillis(d.updatedAt),
                assignmentBrief: typeof d.assignmentBrief === 'string' ? d.assignmentBrief : null,
                stepCount: steps.length,
                acceptedStepCount: steps.filter((s: any) => s?.accepted !== null).length,
                sourceCount: sources.length,
            };
        });

        return { papers };
    },
);
