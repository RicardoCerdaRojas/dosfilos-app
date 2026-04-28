import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@dosfilos/infrastructure';
import { User, UserFilters, UserSortOptions } from '@dosfilos/domain';

/**
 * Subscribes to the full `users` collection in real time and applies filters
 * + sort client-side.
 *
 * Why client-side filtering: the admin dashboard has <10K users in the
 * foreseeable future. With this volume the bandwidth cost is negligible vs
 * the engineering cost of maintaining Firestore composite indexes for every
 * (plan, status, engagement, lastLogin) combination an admin might want.
 *
 * If the user count grows past ~50K, switch to server-side queries with
 * cursor pagination — this hook is the only call site that matters.
 */
export function useAllUsers(filters?: UserFilters, sort?: UserSortOptions) {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch users with real-time updates
    useEffect(() => {
        setLoading(true);

        // Note: Not using orderBy to avoid filtering out users without createdAt
        // Sorting is done client-side
        const q = query(collection(db, 'users'));

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const usersData: User[] = snapshot.docs.map(doc => {
                    const data = doc.data();

                    try {
                        return {
                            id: doc.id,
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
                                updatedAt: data.subscription.updatedAt?.toDate(),
                                lastPaymentError: data.subscription.lastPaymentError ? {
                                    ...data.subscription.lastPaymentError,
                                    attemptedAt: data.subscription.lastPaymentError.attemptedAt?.toDate()
                                } : undefined
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

                            metadata: data.metadata,
                            createdAt: data.createdAt?.toDate() || new Date(),
                            updatedAt: data.updatedAt?.toDate() || new Date()
                        };
                    } catch (err) {
                        console.error('[useAllUsers] Error mapping user:', doc.id, err);
                        // Return a minimal valid user object on error
                        return {
                            id: doc.id,
                            email: data.email || 'unknown',
                            displayName: data.displayName || null,
                            photoURL: null,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        };
                    }
                });

                setUsers(usersData);
                setLoading(false);
            },
            (err) => {
                console.error('[useAllUsers] Error fetching users:', err);
                setError(err.message);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    // Apply client-side filtering and sorting
    const filteredAndSortedUsers = useMemo(() => {
        let result = [...users];

        // Apply filters
        if (filters) {
            if (filters.planId) {
                result = result.filter(user => (user.subscription?.planId ?? 'free') === filters.planId);
            }

            // `status` is overloaded: 'disabled' filters by the soft-disable
            // flag on the user doc; everything else filters Stripe subscription status.
            if (filters.status === 'disabled') {
                result = result.filter(user => user.status === 'disabled');
            } else if (filters.status) {
                result = result.filter(user => user.subscription?.status === filters.status);
            }

            if (filters.searchQuery) {
                const searchLower = filters.searchQuery.toLowerCase();
                result = result.filter(user =>
                    user.displayName?.toLowerCase().includes(searchLower) ||
                    user.email.toLowerCase().includes(searchLower)
                );
            }

            if (filters.engagementLevel) {
                result = result.filter(user => {
                    const score = user.analytics?.engagementScore || 0;
                    if (filters.engagementLevel === 'low') return score < 33;
                    if (filters.engagementLevel === 'medium') return score >= 33 && score < 66;
                    if (filters.engagementLevel === 'high') return score >= 66;
                    return true;
                });
            }

            if (filters.lastLoginAfter) {
                result = result.filter(user => {
                    const lastLogin = user.analytics?.lastLoginAt;
                    return lastLogin && lastLogin >= filters.lastLoginAfter!;
                });
            }

            if (filters.lastLoginBefore) {
                result = result.filter(user => {
                    const lastLogin = user.analytics?.lastLoginAt;
                    return lastLogin && lastLogin <= filters.lastLoginBefore!;
                });
            }
        }

        // Apply sorting
        if (sort) {
            result.sort((a, b) => {
                let aValue: number | string;
                let bValue: number | string;

                switch (sort.field) {
                    case 'displayName':
                        aValue = (a.displayName || '').toLowerCase();
                        bValue = (b.displayName || '').toLowerCase();
                        break;
                    case 'createdAt':
                        aValue = a.createdAt.getTime();
                        bValue = b.createdAt.getTime();
                        break;
                    case 'engagementScore':
                        aValue = a.analytics?.engagementScore || 0;
                        bValue = b.analytics?.engagementScore || 0;
                        break;
                    case 'lastLoginAt':
                        aValue = a.analytics?.lastLoginAt?.getTime() || 0;
                        bValue = b.analytics?.lastLoginAt?.getTime() || 0;
                        break;
                    default:
                        return 0;
                }

                if (aValue === bValue) return 0;
                const cmp = aValue > bValue ? 1 : -1;
                return sort.direction === 'asc' ? cmp : -cmp;
            });
        }

        return result;
    }, [users, filters, sort]);

    return {
        users: filteredAndSortedUsers,
        allUsers: users,
        loading,
        error
    };
}
