/**
 * One-shot bridge for handing off a question + optional image
 * attachment from the Faculty directory page to the chat
 * new-session view.
 *
 * URL params can carry text but not binary, so the directory writes
 * the staged image (already base64) plus the question into
 * sessionStorage and navigates to `/faculty/new` with no `?q=`. The
 * chat page reads + clears the entry on mount and replays the
 * "create-session-and-send-with-attachment" flow.
 *
 * Entries are short-lived: a 60-second TTL guards against zombie
 * payloads from a tab the user opened, abandoned, then revisited
 * weeks later.
 */

const KEY = 'faculty.pending-input';
const TTL_MS = 60_000;

export interface PendingFacultyInput {
    question: string;
    /** Optional attachment carried as already-encoded base64. */
    attachment?: {
        mimeType: string;
        /** Base64 payload, NO `data:...;base64,` prefix. */
        base64: string;
        /** Original filename for the message bubble badge. */
        filename: string;
        /** Bytes for the badge. */
        sizeBytes: number;
    };
    /** Wall-clock ms after which `take()` returns null. */
    expiresAt: number;
}

export function setPendingFacultyInput(input: Omit<PendingFacultyInput, 'expiresAt'>): void {
    try {
        const payload: PendingFacultyInput = {
            ...input,
            expiresAt: Date.now() + TTL_MS,
        };
        sessionStorage.setItem(KEY, JSON.stringify(payload));
    } catch (err) {
        console.warn('[pendingFacultyInput] write failed:', err);
    }
}

/**
 * Reads + removes the pending entry. Returns null when nothing's
 * there or when the entry is past its TTL. Always clears, even on
 * stale, so successive reads don't keep firing.
 */
export function takePendingFacultyInput(): PendingFacultyInput | null {
    try {
        const raw = sessionStorage.getItem(KEY);
        if (!raw) return null;
        sessionStorage.removeItem(KEY);
        const parsed = JSON.parse(raw) as PendingFacultyInput;
        if (typeof parsed.expiresAt !== 'number' || parsed.expiresAt < Date.now()) {
            return null;
        }
        return parsed;
    } catch (err) {
        console.warn('[pendingFacultyInput] read failed:', err);
        return null;
    }
}
