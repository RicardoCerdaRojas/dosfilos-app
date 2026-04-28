import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';

/**
 * Seeds the `llamaparseAccounts` Firestore collection with the launch
 * configuration: account #1 reuses the legacy `LLAMAPARSE_API_KEY` env var
 * and account #2 points to the new `LLAMAPARSE_API_KEY_FREE_1` secret.
 *
 * Run with:
 *   GOOGLE_CLOUD_PROJECT=dosfilosapp \
 *     npx ts-node packages/functions/src/scripts/seedLlamaParseAccounts.ts
 *
 * Idempotent: re-running overwrites the documented fields and preserves
 * anything the runtime added (`lastUsedAt`, `lastAlert90At`, etc.).
 */

interface AccountSeed {
    id: string;
    name: string;
    apiKeySecretEnv: string;
    creditsLimit: number;
    creditsUsed: number;
    priority: number;
    active: boolean;
    /**
     * ISO date string of the NEXT billing-cycle reset for this LlamaParse
     * account. LlamaParse uses billing-anniversary cycles (not calendar
     * boundaries), so each account has its own cycle anchored to the day it
     * was created. Read the next reset day from the LlamaParse dashboard
     * ("Billing period" → end date) and put that here on first seed.
     *
     * After this initial value, the daily `resetLlamaParseCounters` cron
     * advances the date by exactly one month each time it elapses, so we
     * only need to set the FIRST anniversary correctly.
     */
    nextResetIso: string;
}

const ACCOUNTS: AccountSeed[] = [
    {
        id: 'account-1',
        name: 'Cuenta principal (rdocerda)',
        apiKeySecretEnv: 'LLAMAPARSE_API_KEY',
        creditsLimit: 10_000,
        creditsUsed: 9_907,
        priority: 1,
        active: true,
        nextResetIso: '2026-05-22T00:00:00Z',
    },
    {
        id: 'account-2',
        name: 'Cuenta secundaria (ricardo@pulxos)',
        apiKeySecretEnv: 'LLAMAPARSE_API_KEY_FREE_1',
        creditsLimit: 20_000,
        creditsUsed: 0,
        priority: 2,
        active: true,
        nextResetIso: '2026-05-24T00:00:00Z',
    },
];

try {
    initializeApp();
} catch (e: any) {
    if (e?.errorInfo?.code !== 'app/duplicate-app') {
        console.error('[seedLlamaParseAccounts] Firebase initialization failed.');
        console.error('  Hint: run `gcloud auth application-default login` first,');
        console.error('  then `GOOGLE_CLOUD_PROJECT=dosfilosapp npx ts-node ...`.');
        console.error('  Original error:', e?.message ?? e);
        process.exit(1);
    }
}

async function run() {
    const db = getFirestore();

    console.log(`[seedLlamaParseAccounts] Seeding ${ACCOUNTS.length} account(s)…`);

    for (const account of ACCOUNTS) {
        const resetDate = Timestamp.fromDate(new Date(account.nextResetIso));
        const ref = db.collection('llamaparseAccounts').doc(account.id);
        await ref.set(
            {
                name: account.name,
                apiKeySecretEnv: account.apiKeySecretEnv,
                creditsLimit: account.creditsLimit,
                creditsUsed: account.creditsUsed,
                resetDate,
                priority: account.priority,
                active: account.active,
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true },
        );
        console.log(
            `  ✅ ${account.id} → ${account.name}\n` +
            `      ${account.creditsUsed.toLocaleString()}/${account.creditsLimit.toLocaleString()} creds · priority ${account.priority} · resets ${resetDate.toDate().toISOString().slice(0, 10)}`,
        );
    }

    console.log('[seedLlamaParseAccounts] ✅ Done.');
}

run().catch(err => {
    console.error('[seedLlamaParseAccounts] Failed:', err);
    process.exit(1);
});
