/**
 * Shared retry helper for the exegesis Gemini extractors.
 *
 * Pro 2.5 returns 503 ("model experiencing high demand") and 429
 * (rate limit) intermittently during peak windows. Both clear within
 * seconds. A short retry with exponential backoff masks them
 * entirely; only persistent failures bubble up — and those bubble
 * up tagged so the UI can show a specific "Gemini is overloaded"
 * message instead of a generic "extraction failed".
 *
 * Two consumers as of Phase 3b: GeminiPaperRubricExtractor and
 * GeminiStyleGuideManifestExtractor. Future extractors should use
 * this helper too rather than re-implementing the retry loop.
 */

/**
 * Marker error thrown when retries are exhausted on a transient
 * error. The UI checks `isExegesisOverload === true` to swap the
 * toast copy.
 */
export class OverloadedError extends Error {
    readonly isExegesisOverload = true;
    constructor(message: string) {
        super(message);
        this.name = 'OverloadedError';
    }
}

interface WithRetryOptions {
    /** Defaults to 3 attempts (0ms, 800ms, 2400ms backoff). */
    maxAttempts?: number;
    /** Caller name for log lines. */
    contextLabel?: string;
}

/**
 * Runs `fn` up to `maxAttempts` times, retrying on 503/429/rate-limit
 * errors with exponential backoff (0ms, 800ms, 2400ms, 7200ms, ...).
 * Non-transient errors throw immediately. After the last attempt,
 * a transient error is rethrown as `OverloadedError` carrying the
 * original message.
 */
export async function withGeminiRetry<T>(
    fn: () => Promise<T>,
    options: WithRetryOptions = {},
): Promise<T> {
    const maxAttempts = options.maxAttempts ?? 3;
    const label = options.contextLabel ?? 'GeminiRetry';
    let lastError: unknown;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err;
            if (!isTransientError(err) || attempt === maxAttempts - 1) {
                if (isTransientError(err)) {
                    throw new OverloadedError(extractErrorMessage(err));
                }
                throw err;
            }
            const delayMs = 800 * Math.pow(3, attempt);
            console.warn(
                `[${label}] transient error (attempt ${attempt + 1}/${maxAttempts}), retrying in ${delayMs}ms`,
                err,
            );
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }
    throw lastError;
}

function isTransientError(err: unknown): boolean {
    if (!err) return false;
    const e = err as { status?: number; code?: number; message?: string };
    if (e.status === 503 || e.status === 429 || e.code === 503 || e.code === 429) return true;
    const msg = (e.message ?? '').toLowerCase();
    return msg.includes('503') || msg.includes('429')
        || msg.includes('high demand') || msg.includes('overload')
        || msg.includes('rate limit') || msg.includes('try again later');
}

function extractErrorMessage(err: unknown): string {
    const e = err as { message?: string };
    return e?.message ?? 'Gemini service temporarily unavailable';
}
