import { useState, useEffect, useMemo } from 'react';
import { adminUserQueryService } from '@dosfilos/application';
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
 *
 * Firestore SDK + User entity hydration live in
 * `adminUserQueryService.subscribeAllUsers` (compliance C7.3).
 */
export function useAllUsers(filters?: UserFilters, sort?: UserSortOptions) {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        const unsubscribe = adminUserQueryService.subscribeAllUsers(
            (next) => {
                setUsers(next);
                setLoading(false);
            },
            (err) => {
                console.error('[useAllUsers] Error fetching users:', err);
                setError(err.message);
                setLoading(false);
            },
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
