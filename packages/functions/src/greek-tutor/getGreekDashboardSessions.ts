import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { appCheckCallableOptions } from '../config/appCheckOptions';

/**
 * Greek Tutor dashboard — paginated, TRIMMED session read.
 *
 * The dashboard only needs, per session: passage, status, dates, progress,
 * and per unit just `greekForm` (6 short strings) + `progress`
 * (masteryLevel + quizAttempts). The full session doc additionally carries,
 * per unit, several long LLM-generated text fields (identification,
 * recognitionGuidance, functionInContext, significance, reflectiveQuestion,
 * morphologyBreakdown) plus a session-level `responses` map with feedback
 * prose. For a passage with dozens of words those fields dominate the
 * payload — reading 12 full docs in the browser took ~10s.
 *
 * This callable does the read server-side (Admin SDK, in-datacenter) and
 * returns each session with units trimmed to only what the dashboard renders,
 * dropping the heavy fields + `responses`. The browser receives a tiny
 * payload; the full session is fetched only when the pastor opens it.
 *
 * Ordering: createdAt DESC (existing composite index `userId + createdAt`).
 * Pagination: `cursorCreatedAt` (epoch millis) → `startAfter`. `hasMore` is
 * detected by over-fetching one extra doc.
 */

const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 50;

interface TrimmedGreekForm {
    text: string;
    transliteration: string;
    lemma: string;
    morphology: string;
    gloss: string;
    grammaticalCategory: string;
}

interface TrimmedUnit {
    id: string;
    sessionId: string;
    greekForm: TrimmedGreekForm;
    progress?: unknown; // UnitProgress — small (masteryLevel + quizAttempts)
}

interface TrimmedSession {
    id: string;
    userId: string;
    passage: string;
    status: string;
    createdAt: number;
    updatedAt: number;
    sessionProgress?: unknown;
    projectId?: string;
    units: TrimmedUnit[];
}

interface Result {
    sessions: TrimmedSession[];
    hasMore: boolean;
    nextCursor?: number;
}

function trimUnit(raw: any): TrimmedUnit {
    const gf = raw?.greekForm ?? {};
    return {
        id: String(raw?.id ?? ''),
        sessionId: String(raw?.sessionId ?? ''),
        greekForm: {
            text: String(gf.text ?? ''),
            transliteration: String(gf.transliteration ?? ''),
            lemma: String(gf.lemma ?? ''),
            morphology: String(gf.morphology ?? ''),
            gloss: String(gf.gloss ?? ''),
            grammaticalCategory: String(gf.grammaticalCategory ?? ''),
        },
        // `progress` is small (mastery + quiz attempts) and the dashboard reads
        // it for difficulty + completion counts — keep it verbatim.
        ...(raw?.progress !== undefined ? { progress: raw.progress } : {}),
    };
}

function toMillis(value: any): number {
    if (value instanceof Timestamp) return value.toMillis();
    if (value?.toDate) return value.toDate().getTime();
    if (typeof value === 'number') return value;
    return Date.now();
}

export const getGreekDashboardSessions = onCall(
    { ...appCheckCallableOptions() },
    async (request): Promise<Result> => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'User must be authenticated');
        }
        const userId = request.auth.uid;

        const data = request.data ?? {};
        const requested = Number(data.pageSize);
        const pageSize = Number.isInteger(requested) && requested > 0
            ? Math.min(requested, MAX_PAGE_SIZE)
            : DEFAULT_PAGE_SIZE;
        const cursorCreatedAt: number | undefined =
            typeof data.cursorCreatedAt === 'number' ? data.cursorCreatedAt : undefined;

        const db = getFirestore();
        let q = db
            .collection('greek_sessions')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc');
        if (cursorCreatedAt !== undefined) {
            q = q.startAfter(Timestamp.fromMillis(cursorCreatedAt));
        }
        q = q.limit(pageSize + 1); // +1 sentinel to detect another page

        const snapshot = await q.get();
        const docs = snapshot.docs;
        const hasMore = docs.length > pageSize;
        const pageDocs = hasMore ? docs.slice(0, pageSize) : docs;

        const sessions: TrimmedSession[] = pageDocs.map((doc) => {
            const d = doc.data() as any;
            const units = Array.isArray(d.units) ? d.units.map(trimUnit) : [];
            return {
                id: doc.id,
                userId: d.userId,
                passage: d.passage ?? '',
                status: d.status ?? 'ACTIVE',
                createdAt: toMillis(d.createdAt),
                updatedAt: toMillis(d.updatedAt),
                ...(d.sessionProgress !== undefined ? { sessionProgress: d.sessionProgress } : {}),
                ...(d.projectId !== undefined ? { projectId: d.projectId } : {}),
                units,
            };
        });

        const last = sessions[sessions.length - 1];
        return { sessions, hasMore, nextCursor: last?.createdAt };
    },
);
