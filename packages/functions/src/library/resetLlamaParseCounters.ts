import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';

/**
 * Daily scheduled function — resets `creditsUsed` to 0 for any LlamaParse
 * account whose `resetDate` has elapsed, and advances `resetDate` by one
 * month. Idempotent: a second run within the same day finds no eligible
 * accounts.
 *
 * Schedule: every day at 06:00 UTC. Free-tier accounts at LlamaParse reset on
 * the calendar month boundary; running daily catches the rollover within ≤24h.
 */
export const resetLlamaParseCounters = onSchedule(
    {
        schedule: 'every day 06:00',
        timeZone: 'UTC',
        region: 'us-central1',
        memory: '256MiB',
    },
    async () => {
        const db = getFirestore();
        const now = new Date();
        const snap = await db.collection('llamaparseAccounts').get();
        let resetCount = 0;

        for (const doc of snap.docs) {
            const data = doc.data();
            const resetDate: Date = data.resetDate?.toDate?.() ?? new Date(0);
            if (resetDate > now) continue;

            const nextReset = new Date(resetDate);
            // Advance by one month while we're behind. In practice this is a
            // single bump, but if the cron was paused for a few days we
            // catch up cleanly.
            while (nextReset <= now) {
                nextReset.setUTCMonth(nextReset.getUTCMonth() + 1);
            }

            await doc.ref.update({
                creditsUsed: 0,
                resetDate: Timestamp.fromDate(nextReset),
                lastAlert90At: FieldValue.delete(),
                updatedAt: FieldValue.serverTimestamp(),
            });
            console.log(
                `[ResetCounters] ${doc.id}: creditsUsed → 0, next reset ${nextReset.toISOString()}`,
            );
            resetCount++;
        }

        console.log(`[ResetCounters] Done. Reset ${resetCount} account(s).`);
    },
);
