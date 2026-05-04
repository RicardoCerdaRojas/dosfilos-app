import { getFirestore, FieldValue } from 'firebase-admin/firestore';

/**
 * Local mirror of the domain entity — duplicated here because functions
 * package doesn't depend on `@dosfilos/domain`. Keep field names in sync.
 */
interface LlamaParseAccountRecord {
    id: string;
    name: string;
    apiKeySecretEnv: string;
    creditsUsed: number;
    creditsLimit: number;
    resetDate: Date;
    priority: number;
    active: boolean;
    lastUsedAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface SelectedLlamaParseAccount {
    accountId: string;
    accountName: string;
    apiKey: string;
    availableCredits: number;
}

/**
 * Picks the next LlamaParse account to use for an extraction.
 * Convenience wrapper over `selectAllLlamaParseAccounts` that returns
 * the first (highest-priority) eligible account.
 */
export async function selectLlamaParseAccount(
    pagesEstimate: number = 1,
): Promise<SelectedLlamaParseAccount> {
    const all = await selectAllLlamaParseAccounts(pagesEstimate);
    if (all.length === 0) {
        throw new Error(
            `No LlamaParse account with capacity for ${pagesEstimate} pages.`,
        );
    }
    return all[0];
}

/**
 * Returns ALL eligible LlamaParse accounts ordered by priority, so the
 * caller can iterate and try the next one when an upload/poll fails on
 * the first. This is what powers the "try every account before
 * degrading to Gemini" loop in `extractPdfWithGemini`.
 *
 * Strategy:
 *   1. Read every doc in the `llamaparseAccounts` collection.
 *   2. Filter to `active === true` AND `available >= pagesEstimate`.
 *   3. Sort by `priority` asc, breaking ties by lowest `creditsUsed` (so
 *      we drain a single account before rotating — easier to audit
 *      billing).
 *   4. Resolve the API key via `process.env[apiKeySecretEnv]`. Skip
 *      accounts whose secret is missing or has invalid characters.
 *
 * Falls back to a synthetic single-element list built from the legacy
 * `LLAMAPARSE_API_KEY` env var when the collection is empty — keeps
 * existing deployments working without a Firestore migration.
 *
 * Returns an empty array (NOT throws) when nothing is eligible — the
 * caller decides whether absence is fatal or just "go to Gemini".
 */
export async function selectAllLlamaParseAccounts(
    pagesEstimate: number = 1,
): Promise<SelectedLlamaParseAccount[]> {
    const db = getFirestore();
    const accounts = await loadAccounts(db);

    if (accounts.length === 0) {
        const legacyKey = process.env.LLAMAPARSE_API_KEY?.trim();
        if (legacyKey && !/[\r\n\0]/.test(legacyKey)) {
            return [{
                accountId: 'legacy-default',
                accountName: 'Legacy default (LLAMAPARSE_API_KEY)',
                apiKey: legacyKey,
                availableCredits: Number.MAX_SAFE_INTEGER,
            }];
        }
        return [];
    }

    const eligible = accounts
        .filter(a => a.active && (a.creditsLimit - a.creditsUsed) >= pagesEstimate)
        .sort((a, b) => {
            if (a.priority !== b.priority) return a.priority - b.priority;
            return a.creditsUsed - b.creditsUsed;
        });

    const resolved: SelectedLlamaParseAccount[] = [];
    for (const account of eligible) {
        const rawKey = process.env[account.apiKeySecretEnv];
        // Defensive: trim whitespace AND reject keys with characters
        // that HTTP headers can't carry (CR/LF/NUL). A common production
        // failure mode is a secret stored with a trailing newline from a
        // copy/paste in the dashboard — that triggers undici's
        // `InvalidArgumentError: invalid Authorization header` when the
        // key reaches `fetch()`. Skipping the malformed account here
        // lets the next eligible account take over instead of nuking the
        // whole upload.
        const apiKey = rawKey?.trim();
        if (!apiKey) {
            console.warn(
                `[LlamaParseSelector] Account ${account.id} skipped — secret env "${account.apiKeySecretEnv}" not in runtime env`,
            );
            continue;
        }
        if (/[\r\n\0]/.test(apiKey)) {
            console.error(
                `[LlamaParseSelector] Account ${account.id} skipped — secret env "${account.apiKeySecretEnv}" contains invalid header characters (CR/LF/NUL). Re-set the secret without trailing whitespace.`,
            );
            continue;
        }
        resolved.push({
            accountId: account.id,
            accountName: account.name,
            apiKey,
            availableCredits: account.creditsLimit - account.creditsUsed,
        });
    }
    return resolved;
}

/**
 * Records that `pagesUsed` were spent on `accountId`. Uses
 * `FieldValue.increment()` so concurrent extractions don't race.
 */
export async function recordLlamaParseUsage(
    accountId: string,
    pagesUsed: number,
): Promise<void> {
    if (pagesUsed <= 0) return;
    if (accountId === 'legacy-default') {
        // Nothing to track for the legacy single-account fallback — Stripe-side
        // billing is the source of truth there.
        return;
    }
    const db = getFirestore();
    await db.collection('llamaparseAccounts').doc(accountId).update({
        creditsUsed: FieldValue.increment(pagesUsed),
        lastUsedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    });
}

async function loadAccounts(db: FirebaseFirestore.Firestore): Promise<LlamaParseAccountRecord[]> {
    const snap = await db.collection('llamaparseAccounts').get();
    return snap.docs.map(d => {
        const data = d.data();
        return {
            id: d.id,
            name: data.name ?? d.id,
            apiKeySecretEnv: data.apiKeySecretEnv,
            creditsUsed: Number(data.creditsUsed) || 0,
            creditsLimit: Number(data.creditsLimit) || 0,
            resetDate: data.resetDate?.toDate?.() ?? new Date(),
            priority: Number(data.priority) || 100,
            active: data.active !== false,
            lastUsedAt: data.lastUsedAt?.toDate?.(),
            createdAt: data.createdAt?.toDate?.(),
            updatedAt: data.updatedAt?.toDate?.(),
        };
    });
}
