/**
 * Multi-account configuration for LlamaParse extraction (Hito 6).
 *
 * Stored at `config/llamaparseAccounts/{id}` in Firestore. The extraction
 * functions read this collection to pick which account to use for each parse,
 * rotating between free-tier accounts to maximise the 30K credit/month free
 * allotment before paying for the LlamaParse Starter plan.
 *
 * The Stripe-style "secret name" approach keeps actual API keys out of
 * Firestore (which is readable by anyone with project access). The doc holds
 * `apiKeySecretEnv` — the name of the env var / Secret Manager secret —
 * and the extraction function resolves the value at call time.
 */
export interface LlamaParseAccount {
    /** Stable id (e.g. `'free-1'`, `'free-2'`, `'starter-1'`). */
    id: string;

    /** Display label for admin UI. */
    name: string;

    /**
     * Name of the env var / Firebase Functions secret holding the API key.
     * Examples: `'LLAMAPARSE_API_KEY'` (legacy), `'LLAMAPARSE_API_KEY_FREE_2'`.
     * Resolved at runtime via `process.env[apiKeySecretEnv]`.
     */
    apiKeySecretEnv: string;

    /** Pages already consumed in the current period. */
    creditsUsed: number;

    /** Hard cap (free tier = 10000, Starter = 50000, etc.). */
    creditsLimit: number;

    /**
     * Date when `creditsUsed` resets to 0. Free tier resets monthly. The
     * scheduled `resetLlamaParseCounters` cron flips this each month.
     */
    resetDate: Date;

    /**
     * Selection priority — lower number wins. Two accounts with the same
     * priority break ties by lowest creditsUsed.
     */
    priority: number;

    /** Soft toggle for admin to manually disable an account without deleting it. */
    active: boolean;

    /** Bookkeeping for the admin dashboard. */
    lastUsedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Returns the available capacity for an account in pages. Negative when the
 * account has somehow over-spent (shouldn't happen but defensive).
 */
export function llamaParseAvailableCredits(account: LlamaParseAccount): number {
    return Math.max(0, account.creditsLimit - account.creditsUsed);
}

/**
 * `true` when the account can accept N more pages. `pages` defaults to 1 so
 * callers can do a cheap "is anything left at all" check.
 */
export function llamaParseHasCapacity(
    account: LlamaParseAccount,
    pages: number = 1,
): boolean {
    if (!account.active) return false;
    return llamaParseAvailableCredits(account) >= pages;
}
