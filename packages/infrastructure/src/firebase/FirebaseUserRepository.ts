import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    orderBy,
    limit as firestoreLimit,
    updateDoc,
    Timestamp,
    increment
} from 'firebase/firestore';
import { IUserRepository, User, UserAnalytics, UserFilters, UserSortOptions } from '@dosfilos/domain';
import { db } from '../config/firebase';

/**
 * Firebase implementation of user repository for admin operations
 * Provides user management and analytics operations
 */
export class FirebaseUserRepository implements IUserRepository {
    private readonly usersCollection = 'users';

    /**
     * Get all users with optional filters and sorting
     */
    async getAllUsers(filters?: UserFilters, sort?: UserSortOptions): Promise<User[]> {
        let q = query(collection(db, this.usersCollection));

        // Apply filters
        if (filters?.planId) {
            q = query(q, where('subscription.planId', '==', filters.planId));
        }

        if (filters?.status) {
            q = query(q, where('subscription.status', '==', filters.status));
        }

        if (filters?.lastLoginAfter) {
            q = query(q, where('analytics.lastLoginAt', '>=', Timestamp.fromDate(filters.lastLoginAfter)));
        }

        if (filters?.lastLoginBefore) {
            q = query(q, where('analytics.lastLoginAt', '<=', Timestamp.fromDate(filters.lastLoginBefore)));
        }

        // Apply sorting
        if (sort) {
            const sortField = this.mapSortField(sort.field);
            q = query(q, orderBy(sortField, sort.direction));
        } else {
            // Default sort by creation date
            q = query(q, orderBy('createdAt', 'desc'));
        }

        const snapshot = await getDocs(q);
        let users = snapshot.docs.map(doc => this.mapUserFromFirestore(doc.data()));

        // Client-side filtering for search query (Firestore doesn't support LIKE queries)
        if (filters?.searchQuery) {
            const searchLower = filters.searchQuery.toLowerCase();
            users = users.filter(user =>
                user.displayName?.toLowerCase().includes(searchLower) ||
                user.email.toLowerCase().includes(searchLower)
            );
        }

        // Client-side filtering for engagement level
        if (filters?.engagementLevel) {
            users = users.filter(user => {
                const score = user.analytics?.engagementScore || 0;
                if (filters.engagementLevel === 'low') return score < 33;
                if (filters.engagementLevel === 'medium') return score >= 33 && score < 66;
                if (filters.engagementLevel === 'high') return score >= 66;
                return true;
            });
        }

        return users;
    }

    /**
     * Get a single user by ID
     */
    async getUserById(userId: string): Promise<User | null> {
        const userRef = doc(db, this.usersCollection, userId);
        const snapshot = await getDoc(userRef);

        if (!snapshot.exists()) {
            return null;
        }

        return this.mapUserFromFirestore(snapshot.data());
    }

    /**
     * Get a user by email
     */
    async getUserByEmail(email: string): Promise<User | null> {
        const q = query(
            collection(db, this.usersCollection),
            where('email', '==', email),
            firestoreLimit(1)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return null;
        }

        return this.mapUserFromFirestore(snapshot.docs[0].data());
    }

    /**
     * Update user data
     */
    async updateUser(userId: string, data: Partial<User>): Promise<void> {
        const userRef = doc(db, this.usersCollection, userId);

        // Remove undefined values and convert dates to Timestamps
        const updateData: any = {};

        Object.entries(data).forEach(([key, value]) => {
            if (value !== undefined) {
                if (value instanceof Date) {
                    updateData[key] = Timestamp.fromDate(value);
                } else {
                    updateData[key] = value;
                }
            }
        });

        updateData.updatedAt = Timestamp.now();

        await updateDoc(userRef, updateData);
    }

    /**
     * Update user analytics
     */
    async updateUserAnalytics(userId: string, analytics: Partial<UserAnalytics>): Promise<void> {
        const userRef = doc(db, this.usersCollection, userId);

        const updateData: any = {
            updatedAt: Timestamp.now()
        };

        // Convert analytics fields to Firestore format
        Object.entries(analytics).forEach(([key, value]) => {
            if (value !== undefined) {
                if (value instanceof Date) {
                    updateData[`analytics.${key}`] = Timestamp.fromDate(value);
                } else {
                    updateData[`analytics.${key}`] = value;
                }
            }
        });

        await updateDoc(userRef, updateData);
    }

    /**
     * Get count of total users
     */
    async getTotalUsersCount(): Promise<number> {
        const snapshot = await getDocs(collection(db, this.usersCollection));
        return snapshot.size;
    }

    /**
     * Get count of users by plan
     */
    async getUsersByPlanCount(): Promise<{ free: number; pro: number; team: number }> {
        const snapshot = await getDocs(collection(db, this.usersCollection));

        const counts = { free: 0, pro: 0, team: 0 };

        snapshot.docs.forEach(doc => {
            const user = doc.data();
            const planId = user.subscription?.planId || 'free';

            if (planId === 'free') counts.free++;
            else if (planId === 'pro') counts.pro++;
            else if (planId === 'team') counts.team++;
        });

        return counts;
    }

    /**
     * Get users with high churn risk
     */
    async getChurnRiskUsers(limit: number = 50): Promise<User[]> {
        // Get users with high or medium risk level
        const q = query(
            collection(db, this.usersCollection),
            where('analytics.riskLevel', 'in', ['high', 'medium']),
            orderBy('analytics.engagementScore', 'asc'),
            firestoreLimit(limit)
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => this.mapUserFromFirestore(doc.data()));
    }

    /**
     * Increment a counter field in user analytics
     */
    async incrementAnalyticsCounter(
        userId: string,
        field: keyof Pick<
            UserAnalytics,
            'loginCount' | 'sessionCount' | 'sermonsCreated' | 'sermonsGenerated' | 'greekTutorSessions' | 'libraryUploads'
        >,
        amount: number = 1
    ): Promise<void> {
        const userRef = doc(db, this.usersCollection, userId);

        await updateDoc(userRef, {
            [`analytics.${field}`]: increment(amount),
            updatedAt: Timestamp.now()
        });
    }

    /**
     * Update user's last login timestamp
     */
    async updateLastLogin(userId: string): Promise<void> {
        const userRef = doc(db, this.usersCollection, userId);

        await updateDoc(userRef, {
            'analytics.lastLoginAt': Timestamp.now(),
            'analytics.loginCount': increment(1),
            updatedAt: Timestamp.now()
        });
    }

    /**
     * Update user's last activity timestamp
     */
    async updateLastActivity(userId: string): Promise<void> {
        const userRef = doc(db, this.usersCollection, userId);

        await updateDoc(userRef, {
            'analytics.lastActivityAt': Timestamp.now(),
            updatedAt: Timestamp.now()
        });
    }

    /**
     * Map sort field to Firestore field path
     */
    private mapSortField(field: UserSortOptions['field']): string {
        const fieldMap: Record<UserSortOptions['field'], string> = {
            'createdAt': 'createdAt',
            'displayName': 'displayName',
            'engagementScore': 'analytics.engagementScore',
            'lastLoginAt': 'analytics.lastLoginAt'
        };

        return fieldMap[field];
    }

    /**
     * Map Firestore data to User entity
     */
    private mapUserFromFirestore(data: any): User {
        return {
            id: data.id,
            email: data.email,
            displayName: data.displayName || null,
            photoURL: data.photoURL || null,
            role: data.role,
            stripeCustomerId: data.stripeCustomerId,
            subscription: data.subscription ? {
                ...data.subscription,
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
                ...data.analytics,
                lastLoginAt: data.analytics.lastLoginAt?.toDate() || new Date(),
                lastActivityAt: data.analytics.lastActivityAt?.toDate() || new Date(),
                firstSermonAt: data.analytics.firstSermonAt?.toDate(),
                firstAIGenerationAt: data.analytics.firstAIGenerationAt?.toDate()
            } : undefined,
            metadata: data.metadata,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date()
        };
    }
}
