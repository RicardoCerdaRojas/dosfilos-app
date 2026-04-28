import { getFirestore, FieldValue } from 'firebase-admin/firestore';

export type ProcessingMode = 'standard' | 'premium';

/**
 * Server-side mirror of `ProcessingBalanceService.addPack` / `consume` using
 * the admin SDK. Used by extraction Cloud Functions (post-success decrement)
 * and by the Stripe webhook (credit-pack credit on payment).
 *
 * Writes use `FieldValue.increment` so concurrent extractions can decrement
 * the same user balance without races.
 */
export async function consumePagesAdmin(
    userId: string,
    mode: ProcessingMode,
    pages: number,
): Promise<void> {
    if (pages <= 0) return;
    const db = getFirestore();
    const ref = db.collection('users').doc(userId);
    const availableField = mode === 'standard'
        ? 'processingBalance.standardPagesAvailable'
        : 'processingBalance.premiumPagesAvailable';
    const spentField = mode === 'standard'
        ? 'processingBalance.standardSpentTotal'
        : 'processingBalance.premiumSpentTotal';

    await ref.update({
        [availableField]: FieldValue.increment(-pages),
        [spentField]: FieldValue.increment(pages),
        'processingBalance.updatedAt': FieldValue.serverTimestamp(),
    });
}

export async function addPackAdmin(
    userId: string,
    mode: ProcessingMode,
    pages: number,
): Promise<void> {
    if (pages <= 0) return;
    const db = getFirestore();
    const ref = db.collection('users').doc(userId);
    const field = mode === 'standard'
        ? 'processingBalance.standardPagesAvailable'
        : 'processingBalance.premiumPagesAvailable';

    // Ensure the nested object exists (first-time users have no balance field).
    await ref.set(
        {
            processingBalance: {
                standardPagesAvailable: 0,
                premiumPagesAvailable: 0,
                standardSpentTotal: 0,
                premiumSpentTotal: 0,
            },
        },
        { merge: true },
    );

    await ref.update({
        [field]: FieldValue.increment(pages),
        'processingBalance.updatedAt': FieldValue.serverTimestamp(),
    });
}
