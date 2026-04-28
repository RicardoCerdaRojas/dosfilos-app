import {
    doc,
    getDoc,
    getFirestore,
    increment,
    serverTimestamp,
    setDoc,
    updateDoc,
} from 'firebase/firestore';
import type { ProcessingBalance, ProcessingMode } from '@dosfilos/domain';

export type { ProcessingMode } from '@dosfilos/domain';

interface InsufficientBalanceErrorData {
    needed: number;
    available: number;
    mode: ProcessingMode;
}

/**
 * Thrown by `consume()` when the user doesn't have enough pages of the
 * requested mode. UI catches it and prompts to buy a pack.
 */
export class InsufficientBalanceError extends Error {
    readonly code = 'insufficient-balance' as const;
    readonly data: InsufficientBalanceErrorData;
    constructor(data: InsufficientBalanceErrorData) {
        super(
            `Not enough ${data.mode} pages: needed ${data.needed}, available ${data.available}`,
        );
        this.data = data;
    }
}

const ZERO_BALANCE: ProcessingBalance = {
    standardPagesAvailable: 0,
    premiumPagesAvailable: 0,
    standardSpentTotal: 0,
    premiumSpentTotal: 0,
};

/**
 * Service that manages the per-user `processingBalance` document field.
 *
 * Storage convention (mirrors the rest of the app — flat user doc with nested
 * objects, no separate sub-collection): the balance lives at
 * `users/{uid}.processingBalance`. Writes use `increment()` so concurrent
 * extraction completions can decrement safely without races.
 */
export class ProcessingBalanceService {
    private readonly USERS = 'users';

    async getBalance(userId: string): Promise<ProcessingBalance> {
        const db = getFirestore();
        const snap = await getDoc(doc(db, this.USERS, userId));
        if (!snap.exists()) return { ...ZERO_BALANCE };
        const balance = snap.data()?.processingBalance as ProcessingBalance | undefined;
        return balance ? { ...ZERO_BALANCE, ...balance } : { ...ZERO_BALANCE };
    }

    /**
     * Returns true when the user can afford the given page count in the given
     * mode without dipping below zero.
     */
    async hasCapacity(userId: string, mode: ProcessingMode, pages: number): Promise<boolean> {
        const balance = await this.getBalance(userId);
        const available = mode === 'standard'
            ? balance.standardPagesAvailable
            : balance.premiumPagesAvailable;
        return available >= pages;
    }

    /**
     * Atomically debits `pages` from the user's balance for the given mode and
     * increments the `*SpentTotal` counter. Throws `InsufficientBalanceError`
     * if the user can't afford it (caller should NOT have started the
     * extraction in that case).
     */
    async consume(userId: string, mode: ProcessingMode, pages: number): Promise<void> {
        if (pages <= 0) return;
        const balance = await this.getBalance(userId);
        const available = mode === 'standard'
            ? balance.standardPagesAvailable
            : balance.premiumPagesAvailable;
        if (available < pages) {
            throw new InsufficientBalanceError({ needed: pages, available, mode });
        }

        const db = getFirestore();
        const ref = doc(db, this.USERS, userId);
        const availableField = mode === 'standard'
            ? 'processingBalance.standardPagesAvailable'
            : 'processingBalance.premiumPagesAvailable';
        const spentField = mode === 'standard'
            ? 'processingBalance.standardSpentTotal'
            : 'processingBalance.premiumSpentTotal';

        await updateDoc(ref, {
            [availableField]: increment(-pages),
            [spentField]: increment(pages),
            'processingBalance.updatedAt': serverTimestamp(),
        });
    }

    /**
     * Credits `pages` to the user's balance — used by the Stripe webhook when
     * a credit pack is purchased and by the bonus-inicial logic when a plan is
     * activated. Idempotent given a stable caller (the webhook is responsible
     * for deduplicating per session id).
     */
    async addPack(userId: string, mode: ProcessingMode, pages: number): Promise<void> {
        if (pages <= 0) return;
        const db = getFirestore();
        const ref = doc(db, this.USERS, userId);
        const field = mode === 'standard'
            ? 'processingBalance.standardPagesAvailable'
            : 'processingBalance.premiumPagesAvailable';

        // setDoc with merge so the document field exists for first-time users.
        await setDoc(
            ref,
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

        await updateDoc(ref, {
            [field]: increment(pages),
            'processingBalance.updatedAt': serverTimestamp(),
        });
    }
}

export const processingBalanceService = new ProcessingBalanceService();
