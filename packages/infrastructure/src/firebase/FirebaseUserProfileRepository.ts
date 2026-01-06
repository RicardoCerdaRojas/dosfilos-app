import { IUserProfileRepository, User, Subscription } from '@dosfilos/domain';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export class FirebaseUserProfileRepository implements IUserProfileRepository {
    private readonly collection = 'users';

    async getProfile(userId: string): Promise<User | null> {
        const docRef = doc(db, this.collection, userId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            return null;
        }

        const data = docSnap.data();
        return {
            id: docSnap.id,
            email: data.email,
            displayName: data.displayName ?? null,
            photoURL: data.photoURL ?? null,
            stripeCustomerId: data.stripeCustomerId,
            subscription: data.subscription ? this.mapSubscription(data.subscription) : undefined,
            createdAt: data.createdAt?.toDate() ?? new Date(),
            updatedAt: data.updatedAt?.toDate() ?? new Date(),
        };
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
