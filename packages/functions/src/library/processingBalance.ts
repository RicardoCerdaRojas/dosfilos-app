import { getFirestore, FieldValue } from 'firebase-admin/firestore';

export type ProcessingMode = 'standard' | 'premium';

/**
 * Server-side mirror of `ProcessingBalanceService` (admin SDK). Used by:
 *   - extraction Cloud Functions to debit pages on success
 *   - Stripe webhook to credit pack purchases + plan quotas (initial &
 *     monthly renewal)
 *
 * Bucket model (mirrors application/src/services/ProcessingBalanceService.ts):
 *   - plan: monthly quota, RESET on each billing-cycle invoice (no rollover)
 *   - pack: prepaid purchases, persistent (12-month expiration)
 *
 * Consumption order: plan first, then pack.
 */

const ZERO_BUCKETS = {
    planStandardPages: 0,
    planPremiumPages: 0,
    packStandardPages: 0,
    packPremiumPages: 0,
    standardPagesAvailable: 0,
    premiumPagesAvailable: 0,
    standardSpentTotal: 0,
    premiumSpentTotal: 0,
};

interface BalanceShape {
    planStandardPages?: number;
    planPremiumPages?: number;
    packStandardPages?: number;
    packPremiumPages?: number;
    standardPagesAvailable?: number;
    premiumPagesAvailable?: number;
    standardSpentTotal?: number;
    premiumSpentTotal?: number;
}

/**
 * Reads the user's current balance, backfilling missing buckets from the
 * legacy shape (pre-refactor docs only had `*PagesAvailable` — treat as
 * pack so they survive the next plan renewal).
 */
async function readBalance(userId: string): Promise<Required<Omit<BalanceShape, 'standardPagesAvailable' | 'premiumPagesAvailable'>> & {
    standardPagesAvailable: number;
    premiumPagesAvailable: number;
}> {
    const db = getFirestore();
    const snap = await db.collection('users').doc(userId).get();
    const balance = snap.data()?.processingBalance as BalanceShape | undefined;
    if (!balance) {
        return { ...ZERO_BUCKETS };
    }
    const planStandard = balance.planStandardPages ?? 0;
    const planPremium = balance.planPremiumPages ?? 0;
    const packStandard = balance.packStandardPages ?? balance.standardPagesAvailable ?? 0;
    const packPremium = balance.packPremiumPages ?? balance.premiumPagesAvailable ?? 0;
    return {
        planStandardPages: planStandard,
        planPremiumPages: planPremium,
        packStandardPages: packStandard,
        packPremiumPages: packPremium,
        standardPagesAvailable: planStandard + packStandard,
        premiumPagesAvailable: planPremium + packPremium,
        standardSpentTotal: balance.standardSpentTotal ?? 0,
        premiumSpentTotal: balance.premiumSpentTotal ?? 0,
    };
}

/**
 * Debits `pages` from the user's balance, draining plan first then pack.
 * Caller is expected to have already verified capacity (extraction
 * shouldn't START if the balance is insufficient). If the balance turns
 * out short anyway (race), Firestore's `update` will succeed but the
 * resulting numbers may go negative — caller should treat that as a soft
 * audit signal, not a fatal error, since the work is already done.
 */
export async function consumePagesAdmin(
    userId: string,
    mode: ProcessingMode,
    pages: number,
): Promise<void> {
    if (pages <= 0) return;
    const db = getFirestore();
    const ref = db.collection('users').doc(userId);
    const balance = await readBalance(userId);
    const planAvailable = mode === 'standard' ? balance.planStandardPages : balance.planPremiumPages;
    const packAvailable = mode === 'standard' ? balance.packStandardPages : balance.packPremiumPages;

    const fromPlan = Math.min(planAvailable, pages);
    const fromPack = pages - fromPlan;

    const newPlan = planAvailable - fromPlan;
    const newPack = packAvailable - fromPack;

    const planField = mode === 'standard'
        ? 'processingBalance.planStandardPages'
        : 'processingBalance.planPremiumPages';
    const packField = mode === 'standard'
        ? 'processingBalance.packStandardPages'
        : 'processingBalance.packPremiumPages';
    const availableField = mode === 'standard'
        ? 'processingBalance.standardPagesAvailable'
        : 'processingBalance.premiumPagesAvailable';
    const spentField = mode === 'standard'
        ? 'processingBalance.standardSpentTotal'
        : 'processingBalance.premiumSpentTotal';

    // SET plan/pack/available with computed values; INCREMENT spent counter
    // (monotonic, order-independent).
    await ref.update({
        [planField]: newPlan,
        [packField]: newPack,
        [availableField]: newPlan + newPack,
        [spentField]: FieldValue.increment(pages),
        'processingBalance.updatedAt': FieldValue.serverTimestamp(),
    });
}

/**
 * Credits `pages` to the user's PACK bucket. Pack pages persist (12-month
 * window). Idempotent if caller deduplicates by Stripe session id before
 * invoking.
 */
export async function addPackAdmin(
    userId: string,
    mode: ProcessingMode,
    pages: number,
): Promise<void> {
    if (pages <= 0) return;
    const db = getFirestore();
    const ref = db.collection('users').doc(userId);
    const snap = await ref.get();
    const balance = await readBalance(userId);
    const newPack = (mode === 'standard' ? balance.packStandardPages : balance.packPremiumPages) + pages;
    const planAvailable = mode === 'standard' ? balance.planStandardPages : balance.planPremiumPages;

    // Only seed the zero-bucket structure when the balance doesn't exist
    // yet. Unconditionally writing it with `set merge: true` would
    // overwrite leaf values back to 0 between successive calls — the
    // second call's pre-ensure would zero what the first one just wrote.
    if (!snap.exists || !snap.data()?.processingBalance) {
        await ref.set(
            { processingBalance: { ...ZERO_BUCKETS } },
            { merge: true },
        );
    }

    const packField = mode === 'standard'
        ? 'processingBalance.packStandardPages'
        : 'processingBalance.packPremiumPages';
    const availableField = mode === 'standard'
        ? 'processingBalance.standardPagesAvailable'
        : 'processingBalance.premiumPagesAvailable';

    await ref.update({
        [packField]: newPack,
        [availableField]: planAvailable + newPack,
        'processingBalance.updatedAt': FieldValue.serverTimestamp(),
    });
}

/**
 * SETs the user's PLAN bucket to `pages` for the given mode. Used by the
 * Stripe webhook on subscription activation (bonus-inicial seed) and on
 * each billing-cycle invoice (monthly reset). Pack pages are untouched.
 *
 * Idempotency: caller MUST deduplicate by invoice id (or subscription id
 * for the activation case) before invoking — this function unconditionally
 * overwrites the bucket.
 */
export async function setPlanQuotaAdmin(
    userId: string,
    mode: ProcessingMode,
    pages: number,
): Promise<void> {
    const db = getFirestore();
    const ref = db.collection('users').doc(userId);
    const snap = await ref.get();
    const balance = await readBalance(userId);
    const newPlan = Math.max(0, pages);
    const packAvailable = mode === 'standard' ? balance.packStandardPages : balance.packPremiumPages;

    // Only seed the zero-bucket structure when the balance doesn't exist
    // yet. Unconditional `set merge: true` overwrites leaf values back
    // to 0 between successive calls (e.g. setPlanQuotaAdmin('standard',
    // 5000) followed by setPlanQuotaAdmin('premium', 300) would lose
    // the 5000 that the first call wrote because the second call's
    // pre-ensure would zero it out before its update fires).
    if (!snap.exists || !snap.data()?.processingBalance) {
        await ref.set(
            { processingBalance: { ...ZERO_BUCKETS } },
            { merge: true },
        );
    }

    const planField = mode === 'standard'
        ? 'processingBalance.planStandardPages'
        : 'processingBalance.planPremiumPages';
    const availableField = mode === 'standard'
        ? 'processingBalance.standardPagesAvailable'
        : 'processingBalance.premiumPagesAvailable';

    await ref.update({
        [planField]: newPlan,
        [availableField]: newPlan + packAvailable,
        'processingBalance.updatedAt': FieldValue.serverTimestamp(),
    });
}
