import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

interface IncrementUsageRequest {
    kind: 'query';  // Only 'query' is client-initiated; page counts are incremented
                    // server-side by the extraction trigger (autoIndexOnExtractionReady
                    // or extractPdfWithGemini) so the user can't understate their usage.
}

/**
 * Callable: atomically increments the authenticated user's monthly query counter.
 *
 * Call this from the client IMMEDIATELY after a chat message is accepted by
 * Gemini (not before — or a rate-limited user could still bill). The function
 * uses FieldValue.increment() so concurrent calls don't race.
 *
 * Pages processed are NOT incremented from the client — the extraction trigger
 * (which knows the true page count from LlamaParse/Gemini) does it server-side.
 */
export const incrementUsage = onCall<IncrementUsageRequest>(
    {
        region: 'us-central1',
        memory: '256MiB',
        timeoutSeconds: 30,
        cors: true,
    },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Sign-in required');
        }
        const userId = request.auth.uid;
        const { kind } = request.data;

        if (kind !== 'query') {
            throw new HttpsError('invalid-argument', `Unsupported kind: ${kind}`);
        }

        const db = getFirestore();
        const periodKey = currentPeriodKey();
        const ref = db.doc(`users/${userId}/usage_counters/${periodKey}`);

        const now = new Date();
        await ref.set({
            userId,
            periodKey,
            queriesUsed: FieldValue.increment(1),
            lastEventAt: now,
        }, { merge: true });

        // Set firstEventAt only on first event of the period.
        const snap = await ref.get();
        if (!snap.data()?.firstEventAt) {
            await ref.set({ firstEventAt: now }, { merge: true });
        }

        return { success: true, periodKey };
    }
);

function currentPeriodKey(date: Date = new Date()): string {
    const yyyy = date.getUTCFullYear();
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
}
