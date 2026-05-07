import { useEffect, useState } from 'react';
import { processingBalanceService } from '@dosfilos/application';
import {
    computeExegesisQuotaState,
    type ExegesisQuotaState,
    type ProcessingBalance,
} from '@dosfilos/domain';
import { useFirebase } from '@/context/firebase-context';

/**
 * Subscribes to the user's `processingBalance` and returns the
 * derived exégesis quota state — the same shape every UI surface
 * (banner, gating modal, pre-confirm) reads.
 *
 * Returns `null` while the initial Firestore snapshot is loading
 * (so callers can render a skeleton). After that the state object
 * updates live as the cloud functions debit, the Stripe webhook
 * credits packs, or the user runs an operation that drains the
 * bucket.
 *
 * No-op when the user isn't authenticated — returns `null` and
 * doesn't open any listener. The Firebase context provides the
 * `user` object; when it flips to authenticated the hook starts the
 * subscription on the next render.
 */
export function useExegesisQuota(): ExegesisQuotaState | null {
    const { user } = useFirebase();
    const [balance, setBalance] = useState<ProcessingBalance | null>(null);

    useEffect(() => {
        if (!user) {
            setBalance(null);
            return;
        }
        const unsubscribe = processingBalanceService.subscribeToBalance(
            user.uid,
            (b) => setBalance(b),
            () => { /* errors are logged inside the service */ },
        );
        return () => unsubscribe();
    }, [user]);

    if (!balance) return null;
    return computeExegesisQuotaState(balance);
}
