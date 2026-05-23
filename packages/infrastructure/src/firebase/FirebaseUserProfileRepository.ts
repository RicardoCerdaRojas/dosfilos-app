import { IUserProfileRepository, User, Subscription } from '@dosfilos/domain';
import type { SupportedLanguage, UpdateDeclaredConfessionInput } from '@dosfilos/domain';
import { addDoc, collection, doc, getDoc, setDoc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

export class FirebaseUserProfileRepository implements IUserProfileRepository {
    private readonly collection = 'users';

    async getProfile(userId: string): Promise<User | null> {
        const docRef = doc(db, this.collection, userId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            return null;
        }

        return this.mapProfile(docSnap.id, docSnap.data());
    }

    /**
     * Real-time subscription to the user's profile doc. Used by hooks (sidebar
     * plan chip, subscription badge) that need to reflect admin-driven plan
     * changes + Stripe webhook updates without a manual refresh.
     */
    subscribeProfile(
        userId: string,
        onChange: (profile: User | null) => void,
        onError?: (err: Error) => void,
    ): () => void {
        const docRef = doc(db, this.collection, userId);
        return onSnapshot(
            docRef,
            (snap) => {
                if (!snap.exists()) {
                    onChange(null);
                    return;
                }
                onChange(this.mapProfile(snap.id, snap.data()));
            },
            (err) => onError?.(err),
        );
    }

    private mapProfile(id: string, data: any): User {
        return {
            id,
            email: data.email,
            displayName: data.displayName ?? null,
            photoURL: data.photoURL ?? null,
            stripeCustomerId: data.stripeCustomerId,
            subscription: data.subscription ? this.mapSubscription(data.subscription) : undefined,
            preferredLanguage: data.preferredLanguage,
            featureFlags: data.featureFlags ?? undefined,
            declaredConfession: data.declaredConfession ?? undefined,
            confessionAffirmedAt: data.confessionAffirmedAt?.toDate?.() ?? undefined,
            confessionVisibility: data.confessionVisibility ?? undefined,
            createdAt: data.createdAt?.toDate() ?? new Date(),
            updatedAt: data.updatedAt?.toDate() ?? new Date(),
        };
    }

    async updateDeclaredConfession(
        userId: string,
        input: UpdateDeclaredConfessionInput,
    ): Promise<void> {
        const docRef = doc(db, this.collection, userId);
        // Read previous values so the audit row captures the transition.
        // Best-effort; if it fails we still proceed with the write.
        let previousConfession: string | null = null;
        let previousVisibility: string | null = null;
        try {
            const prevSnap = await getDoc(docRef);
            if (prevSnap.exists()) {
                const data = prevSnap.data();
                previousConfession = data.declaredConfession ?? null;
                previousVisibility = data.confessionVisibility ?? null;
            }
        } catch {
            // ignore — audit metadata is best-effort
        }

        await setDoc(docRef, {
            declaredConfession: input.declaredConfession,
            confessionVisibility: input.confessionVisibility ?? 'private',
            confessionAffirmedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        }, { merge: true });

        // Write an audit row so the trail keeps every confession change. The
        // collection is flat (not a user subcollection) so the admin audit
        // dashboard can aggregate across users without per-user reads.
        try {
            await addDoc(collection(db, 'confessionChangeAudit'), {
                userId,
                previousConfession,
                previousVisibility,
                newConfession: input.declaredConfession,
                newVisibility: input.confessionVisibility ?? 'private',
                changedAt: serverTimestamp(),
            });
        } catch (err) {
            console.error('[confession-audit] failed to write audit row:', err);
        }
    }

    async updatePreferredLanguage(userId: string, language: SupportedLanguage): Promise<void> {
        const docRef = doc(db, this.collection, userId);
        await setDoc(docRef, {
            preferredLanguage: language,
            updatedAt: serverTimestamp(),
        }, { merge: true });
    }

    async updateSubscription(userId: string, subscription: Subscription): Promise<void> {
        const docRef = doc(db, this.collection, userId);

        await updateDoc(docRef, {
            subscription: {
                id: subscription.id,
                planId: subscription.planId,
                status: subscription.status,
                stripePriceId: subscription.stripePriceId,
                startDate: subscription.startDate,
                currentPeriodStart: subscription.currentPeriodStart,
                currentPeriodEnd: subscription.currentPeriodEnd,
                cancelledAt: subscription.cancelledAt ?? null,
                cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
                failedPaymentAttempts: subscription.failedPaymentAttempts ?? 0,
                lastPaymentError: subscription.lastPaymentError ?? null,
                trialEnd: subscription.trialEnd ?? null,
                updatedAt: subscription.updatedAt,
            },
            updatedAt: serverTimestamp(),
        });
    }

    async updateStripeCustomerId(userId: string, customerId: string): Promise<void> {
        const docRef = doc(db, this.collection, userId);

        await setDoc(docRef, {
            stripeCustomerId: customerId,
            updatedAt: serverTimestamp(),
        }, { merge: true });
    }

    private mapSubscription(data: any): Subscription {
        return {
            id: data.id,
            planId: data.planId,
            status: data.status,
            stripePriceId: data.stripePriceId,
            startDate: data.startDate?.toDate() ?? new Date(),
            currentPeriodStart: data.currentPeriodStart?.toDate() ?? new Date(),
            currentPeriodEnd: data.currentPeriodEnd?.toDate() ?? new Date(),
            cancelledAt: data.cancelledAt?.toDate(),
            cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? false,
            failedPaymentAttempts: data.failedPaymentAttempts,
            lastPaymentError: data.lastPaymentError ? {
                message: data.lastPaymentError.message,
                attemptedAt: data.lastPaymentError.attemptedAt?.toDate() ?? new Date(),
            } : undefined,
            trialEnd: data.trialEnd?.toDate(),
            updatedAt: data.updatedAt?.toDate() ?? new Date(),
        };
    }
}
