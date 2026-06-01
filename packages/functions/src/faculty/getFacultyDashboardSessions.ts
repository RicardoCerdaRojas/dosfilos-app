import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { appCheckCallableOptions } from '../config/appCheckOptions';

/**
 * Faculty chat — trimmed session list read for the sidebar / dashboard.
 *
 * Each `users/{uid}/ai_sessions` doc carries the full `messages[]` transcript
 * (content + sources[] + attachments[]) — heavy. The session LIST only renders
 * title, date, project link, and a message-count badge. The Firestore web SDK
 * can't field-project, so the old `getUserSessions` shipped every transcript to
 * the browser just to draw the sidebar.
 *
 * This callable reads server-side (Admin SDK) and returns each session WITHOUT
 * `messages` (replaced by `messageCount`), dropping the dominant payload. The
 * full transcript is fetched per-session via `getSession` when one is opened.
 *
 * Ordering: updatedAt DESC (subcollection single-field index — automatic, no
 * composite index needed). Capped at MAX_SESSIONS; trimmed docs are tiny so the
 * cap is a safety bound, not a UX limit. Truncation is logged.
 */

const MAX_SESSIONS = 200;

interface SummarySession {
    id: string;
    userId: string;
    agentId: string;
    title: string;
    projectId?: string;
    createdAt: number;
    updatedAt: number;
    messageCount: number;
    context?: unknown;
    guidedSermonSession?: unknown;
    messages: never[];
}

function toMillis(value: any): number {
    if (value instanceof Timestamp) return value.toMillis();
    if (value?.toDate) return value.toDate().getTime();
    if (typeof value === 'number') return value;
    return Date.now();
}

export const getFacultyDashboardSessions = onCall(
    { ...appCheckCallableOptions() },
    async (request): Promise<{ sessions: SummarySession[]; truncated: boolean }> => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'User must be authenticated');
        }
        const userId = request.auth.uid;

        const db = getFirestore();
        const snapshot = await db
            .collection('users')
            .doc(userId)
            .collection('ai_sessions')
            .orderBy('updatedAt', 'desc')
            .limit(MAX_SESSIONS + 1)
            .get();

        const docs = snapshot.docs;
        const truncated = docs.length > MAX_SESSIONS;
        if (truncated) {
            console.warn(`[getFacultyDashboardSessions] user ${userId} has >${MAX_SESSIONS} sessions; list truncated`);
        }
        const pageDocs = truncated ? docs.slice(0, MAX_SESSIONS) : docs;

        const sessions: SummarySession[] = pageDocs.map((doc) => {
            const d = doc.data() as any;
            const messageCount = Array.isArray(d.messages) ? d.messages.length : 0;
            return {
                id: doc.id,
                userId: d.userId,
                agentId: d.agentId,
                title: d.title ?? '',
                createdAt: toMillis(d.createdAt),
                updatedAt: toMillis(d.updatedAt),
                messageCount,
                messages: [],
                ...(d.projectId !== undefined ? { projectId: d.projectId } : {}),
                ...(d.context !== undefined ? { context: d.context } : {}),
                ...(d.guidedSermonSession !== undefined ? { guidedSermonSession: d.guidedSermonSession } : {}),
            };
        });

        return { sessions, truncated };
    },
);
