import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@dosfilos/infrastructure';
import type { User } from '@dosfilos/domain';

/**
 * Subscribes to a single user document in real time. Used by the admin user
 * detail page so that mutations (grant credits, extend trial, change plan)
 * surface in the UI without a manual refetch.
 *
 * Parses the same shape as useAllUsers — kept in sync intentionally; if
 * either drifts the admin views diverge.
 */
export function useUserProfile(userId: string | undefined) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!userId) {
            setUser(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        const ref = doc(db, 'users', userId);
        const unsub = onSnapshot(
            ref,
            (snap) => {
                if (!snap.exists()) {
                    setUser(null);
                    setError('User not found');
                    setLoading(false);
                    return;
                }
                const data = snap.data();
                setUser({
                    id: snap.id,
                    email: data.email || '',
                    displayName: data.displayName || null,
                    photoURL: data.photoURL || null,
                    role: data.role,
                    status: data.status || 'active',
                    stripeCustomerId: data.stripeCustomerId,
                    preferredLanguage: data.preferredLanguage,
                    subscription: data.subscription ? {
                        id: data.subscription.id || '',
                        planId: data.subscription.planId || 'free',
                        status: data.subscription.status || 'active',
                        stripePriceId: data.subscription.stripePriceId || '',
                        cancelAtPeriodEnd: data.subscription.cancelAtPeriodEnd ?? false,
                        startDate: data.subscription.startDate?.toDate(),
                        currentPeriodStart: data.subscription.currentPeriodStart?.toDate(),
                        currentPeriodEnd: data.subscription.currentPeriodEnd?.toDate(),
                        cancelledAt: data.subscription.cancelledAt?.toDate(),
                        trialEnd: data.subscription.trialEnd?.toDate(),
                        trialStartedAt: data.subscription.trialStartedAt?.toDate(),
                        gracePeriodEnd: data.subscription.gracePeriodEnd?.toDate(),
                        failedPaymentAttempts: data.subscription.failedPaymentAttempts,
                        updatedAt: data.subscription.updatedAt?.toDate(),
                        lastPaymentError: data.subscription.lastPaymentError ? {
                            ...data.subscription.lastPaymentError,
                            attemptedAt: data.subscription.lastPaymentError.attemptedAt?.toDate(),
                        } : undefined,
                    } : undefined,
                    analytics: data.analytics ? {
                        lastLoginAt: data.analytics.lastLoginAt?.toDate() || new Date(),
                        lastActivityAt: data.analytics.lastActivityAt?.toDate() || new Date(),
                        loginCount: data.analytics.loginCount || 0,
                        sessionCount: data.analytics.sessionCount || 0,
                        totalSessionDuration: data.analytics.totalSessionDuration || 0,
                        sermonsCreated: data.analytics.sermonsCreated || 0,
                        sermonsPublished: data.analytics.sermonsPublished || 0,
                        sermonsGenerated: data.analytics.sermonsGenerated || 0,
                        greekTutorSessions: data.analytics.greekTutorSessions || 0,
                        greekTutorCompleted: data.analytics.greekTutorCompleted || 0,
                        libraryUploads: data.analytics.libraryUploads || 0,
                        seriesCreated: data.analytics.seriesCreated || 0,
                        preachingPlansCreated: data.analytics.preachingPlansCreated || 0,
                        contentCreatedToday: data.analytics.contentCreatedToday || 0,
                        contentCreatedThisWeek: data.analytics.contentCreatedThisWeek || 0,
                        engagementScore: data.analytics.engagementScore || 0,
                        riskLevel: data.analytics.riskLevel || 'low',
                        firstSermonAt: data.analytics.firstSermonAt?.toDate(),
                        firstAIGenerationAt: data.analytics.firstAIGenerationAt?.toDate(),
                        lastContentCreatedAt: data.analytics.lastContentCreatedAt?.toDate(),
                    } : undefined,
                    processingBalance: data.processingBalance ? {
                        standardPagesAvailable: data.processingBalance.standardPagesAvailable ?? 0,
                        premiumPagesAvailable: data.processingBalance.premiumPagesAvailable ?? 0,
                        standardSpentTotal: data.processingBalance.standardSpentTotal ?? 0,
                        premiumSpentTotal: data.processingBalance.premiumSpentTotal ?? 0,
                        updatedAt: data.processingBalance.updatedAt?.toDate(),
                    } : undefined,
                    metadata: data.metadata,
                    createdAt: data.createdAt?.toDate() || new Date(),
                    updatedAt: data.updatedAt?.toDate() || new Date(),
                });
                setError(null);
                setLoading(false);
            },
            (err) => {
                console.error('[useUserProfile]', err);
                setError(err.message);
                setLoading(false);
            }
        );

        return () => unsub();
    }, [userId]);

    return { user, loading, error };
}
