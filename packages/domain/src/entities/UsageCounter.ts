/**
 * Monthly usage counter for a single user.
 *
 * Persisted at: `users/{userId}/usage_counters/{periodKey}` where `periodKey`
 * is the calendar month in "YYYY-MM" format (e.g., "2026-04"). A new document
 * is created the first time the user triggers a countable event in a given month.
 *
 * Counters are incremented atomically via FieldValue.increment() to avoid
 * races when multiple events fire close together.
 */
export interface UsageCounter {
    userId: string;
    periodKey: string;          // "YYYY-MM"

    /** Pages extracted by LlamaParse this month (main cost driver for extraction). */
    pagesProcessed: number;

    /** Chat messages / queries sent to tutors this month (Gemini inference cost). */
    queriesUsed: number;

    /** Number of documents uploaded this month (informational, not gated). */
    docsUploadedThisMonth: number;

    /** First and last event timestamps in this period (for analytics). */
    firstEventAt: Date;
    lastEventAt: Date;
}

export type UsageEvent =
    | { kind: 'pages-processed'; pages: number; resourceId: string }
    | { kind: 'query'; sessionId?: string }
    | { kind: 'doc-uploaded'; resourceId: string };

/**
 * Compute the period key for a given Date (defaults to now).
 * Format: "YYYY-MM" in the server's local timezone (should be UTC in Cloud Functions).
 */
export function currentPeriodKey(date: Date = new Date()): string {
    const yyyy = date.getUTCFullYear();
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
}
