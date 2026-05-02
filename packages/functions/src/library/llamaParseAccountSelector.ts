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
 *
 * Strategy:
 *   1. Read every doc in `config/llamaparseAccounts`.
 *   2. Filter to `active === true` and `available > pages`.
 *   3. Sort by `priority` asc, breaking ties by lowest `creditsUsed` (so we
 *      drain a single account before rotating — easier to audit billing).
 *   4. Resolve the API key via `process.env[apiKeySecretEnv]`.
 *   5. Return the first whose secret is actually present in the runtime env.
 *
 * Falls back to legacy `LLAMAPARSE_API_KEY` env var (single-account world)
 * when the collection is empty — keeps existing deployments working without a
 * Firestore migration.
 */
export async function selectLlamaParseAccount(
    pagesEstimate: number = 1,
): Promise<SelectedLlamaParseAccount> {
    const db = getFirestore();
    // Stored as a top-level `llamaparseAccounts` collection (one doc per
    // account). The roadmap originally proposed `config/llamaparseAccounts/{id}`
    // but Firestore's `config/{name}` is a single-document path, not a
    // collection; promoting to a top-level collection is the correct shape.
    const accounts = await loadAccounts(db);

    if (accounts.length === 0) {
        const legacyKey = process.env.LLAMAPARSE_API_KEY;
        if (legacyKey) {
            return {
                accountId: 'legacy-default',
                accountName: 'Legacy default (LLAMAPARSE_API_KEY)',
                apiKey: legacyKey,
                availableCredits: Number.MAX_SAFE_INTEGER,
            };
        }
        throw new Error(
            'No LlamaParse accounts configured. Either seed `llamaparseAccounts` or set LLAMAPARSE_API_KEY.',
        );
    }

    const eligible = accounts
        .filter(a => a.active && (a.creditsLimit - a.creditsUsed) >= pagesEstimate)
        .sort((a, b) => {
            if (a.priority !== b.priority) return a.priority - b.priority;
            return a.creditsUsed - b.creditsUsed;
        });

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
        return {
            accountId: account.id,
            accountName: account.name,
            apiKey,
            availableCredits: account.creditsLimit - account.creditsUsed,
        };
    }

    throw new Error(
        `No LlamaParse account with capacity for ${pagesEstimate} pages. Configured accounts: ${accounts.length}, eligible: ${eligible.length}.`,
    );
    // Unreachable fallback to satisfy older TS targets without `never`.
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
