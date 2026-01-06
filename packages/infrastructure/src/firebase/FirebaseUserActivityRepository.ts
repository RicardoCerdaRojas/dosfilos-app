import {
    Firestore,
    collection,
    query,
    where,
    getDocs,
    getDoc,
    doc,
    orderBy,
    Timestamp,
} from 'firebase/firestore';
import {
    IUserActivityRepository,
    UserActivitySummary,
    ContentActivity,
    UserActivityFilters,
} from '@dosfilos/domain';

/**
 * Firebase implementation of IUserActivityRepository
 * Aggregates activity data from multiple Firestore collections
 */
export class FirebaseUserActivityRepository implements IUserActivityRepository {
    private readonly usersCollection = 'users';
    private readonly sermonsCollection = 'sermons';
    private readonly greekSessionsCollection = 'greek_tutor_sessions';
    private readonly seriesCollection = 'sermon_series';
    private readonly libraryCollection = 'library_resources';
    private readonly plansCollection = 'preaching_plans';

    constructor(private db: Firestore) { }

    async getUserActivitySummary(userId: string): Promise<UserActivitySummary | null> {
        try {
            // Get user document with analytics
            const userRef = doc(this.db, this.usersCollection, userId);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                return null;
            }

            const userData = userSnap.data();
            const analytics = userData.analytics || {};

            // Get recent content in parallel
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            weekAgo.setHours(0, 0, 0, 0);

            const [contentToday, contentWeek] = await Promise.all([
                this.getRecentContent(userId, 0), // 0 = today only
                this.getRecentContent(userId, 7),
            ]);

            // Build summary from user analytics counters
            const summary: UserActivitySummary = {
                userId,
                userEmail: userData.email || '',
                userDisplayName: userData.displayName || null,
                userPhotoURL: userData.photoURL || null,

                // Content totals - COUNT REAL DATA from collections
                totalSermonsCreated: await this.countUserSermons(userId),
                totalSermonsPublished: await this.countUserSermons(userId, 'published'),
                totalSermonsGenerated: analytics.sermonsGenerated || 0,
                totalGreekSessions: await this.countUserGreekSessions(userId),
                totalGreekSessionsCompleted: await this.countUserGreekSessions(userId, true),
                totalSeriesCreated: await this.countUserSeries(userId),
                totalLibraryUploads: await this.countUserLibraryUploads(userId),
                totalPreachingPlans: await this.countUserPreachingPlans(userId),

                // Recent activity
                contentCreatedToday: contentToday,
                contentCreatedThisWeek: contentWeek,
                lastContentCreatedAt: analytics.lastContentCreatedAt?.toDate?.() || undefined,

                // Engagement
                engagementScore: analytics.engagementScore || 0,
                riskLevel: analytics.riskLevel || 'low',
                lastLoginAt: analytics.lastLoginAt?.toDate?.() || new Date(),
                lastActivityAt: analytics.lastActivityAt?.toDate?.() || new Date(),
                loginCount: analytics.loginCount || 0,

                // Subscription
                planId: userData.subscription?.planId || 'free',
                subscriptionStatus: userData.subscription?.status || 'active',

                // Timestamps
                createdAt: userData.createdAt?.toDate?.() || new Date(),
                updatedAt: userData.updatedAt?.toDate?.() || new Date(),
            };

            return summary;
        } catch (error) {
            console.error('Error getting user activity summary:', error);
            throw error;
        }
    }

    async getAllUsersActivitySummary(filters?: UserActivityFilters): Promise<UserActivitySummary[]> {
        try {
            // Build query for users collection
            let q = query(collection(this.db, this.usersCollection));

            // Apply filters
            if (filters?.planId) {
                q = query(q, where('subscription.planId', '==', filters.planId));
            }

            if (filters?.status) {
                q = query(q, where('subscription.status', '==', filters.status));
            }

            const usersSnap = await getDocs(q);
            const summaries: UserActivitySummary[] = [];

            // Get summaries for all users
            for (const userDoc of usersSnap.docs) {
                const summary = await this.getUserActivitySummary(userDoc.id);
                if (summary) {
                    // Apply additional filters
                    if (filters?.hasContentToday && summary.contentCreatedToday.length === 0) {
                        continue;
                    }

                    if (
                        filters?.minEngagementScore !== undefined &&
                        summary.engagementScore < filters.minEngagementScore
                    ) {
                        continue;
                    }

                    if (
                        filters?.maxEngagementScore !== undefined &&
                        summary.engagementScore > filters.maxEngagementScore
                    ) {
                        continue;
                    }

                    if (filters?.searchQuery) {
                        const search = filters.searchQuery.toLowerCase();
                        const matchesEmail = summary.userEmail.toLowerCase().includes(search);
                        const matchesName = summary.userDisplayName?.toLowerCase().includes(search);

                        if (!matchesEmail && !matchesName) {
                            continue;
                        }
                    }

                    summaries.push(summary);
                }
            }

            return summaries;
        } catch (error) {
            console.error('Error getting all users activity:', error);
            throw error;
        }
    }

    async getRecentContent(userId: string, days: number): Promise<ContentActivity[]> {
        const now = new Date();
        let sinceDate: Date;

        if (days === 0) {
            // Special case: today only (from midnight)
            sinceDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        } else {
            sinceDate = new Date();
            sinceDate.setDate(sinceDate.getDate() - days);
            sinceDate.setHours(0, 0, 0, 0);
        }

        const sinceTimestamp = Timestamp.fromDate(sinceDate);

        try {
            // Query all content types in parallel
            const [sermons, greekSessions, series, libraryUploads, plans] = await Promise.all([
                this.getRecentSermons(userId, sinceTimestamp),
                this.getRecentGreekSessions(userId, sinceTimestamp),
                this.getRecentSeries(userId, sinceTimestamp),
                this.getRecentLibraryUploads(userId, sinceTimestamp),
                this.getRecentPlans(userId, sinceTimestamp),
            ]);

            // Combine and sort by date descending
            const allContent = [...sermons, ...greekSessions, ...series, ...libraryUploads, ...plans];
            return allContent.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        } catch (error) {
            console.error('Error getting recent content:', error);
            throw error;
        }
    }

    async getUserContentByType(userId: string, type: ContentActivity['type']): Promise<ContentActivity[]> {
        const collectionName = this.getCollectionForType(type);
        const q = query(
            collection(this.db, collectionName),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc')
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map((doc) => this.mapToContentActivity(doc.data(), type));
    }

    async incrementContentCounter(
        userId: string,
        contentType: ContentActivity['type'],
        isPublished: boolean = false
    ): Promise<void> {
        // This will be implemented in a separate use case/service
        // For now, this is a placeholder
        // The actual implementation will use Firestore transactions or Cloud Functions
        console.log(`Increment counter for user ${userId}, type ${contentType}, published: ${isPublished}`);
    }

    // Private helper methods

    private async getRecentSermons(userId: string, since: Timestamp): Promise<ContentActivity[]> {
        try {
            const q = query(
                collection(this.db, this.sermonsCollection),
                where('userId', '==', userId),
                where('createdAt', '>=', since),
                orderBy('createdAt', 'desc')
            );

            const snapshot = await getDocs(q);
            return snapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    type: 'sermon' as const,
                    title: data.title || 'Sermón sin título',
                    createdAt: data.createdAt?.toDate() || new Date(),
                    status: data.status || 'draft',
                };
            });
        } catch (error) {
            console.error('Error fetching recent sermons:', error);
            return [];
        }
    }

    private async getRecentGreekSessions(userId: string, since: Timestamp): Promise<ContentActivity[]> {
        try {
            const q = query(
                collection(this.db, this.greekSessionsCollection),
                where('userId', '==', userId),
                where('createdAt', '>=', since),
                orderBy('createdAt', 'desc')
            );

            const snapshot = await getDocs(q);
            return snapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    type: 'greek_session' as const,
                    title: data.passage || 'Sesión Greek Tutor',
                    createdAt: data.createdAt?.toDate() || new Date(),
                    status: data.isCompleted ? 'completed' : 'in_progress',
                };
            });
        } catch (error) {
            console.error('Error fetching recent Greek sessions:', error);
            return [];
        }
    }

    private async getRecentSeries(userId: string, since: Timestamp): Promise<ContentActivity[]> {
        try {
            const q = query(
                collection(this.db, this.seriesCollection),
                where('userId', '==', userId),
                where('createdAt', '>=', since),
                orderBy('createdAt', 'desc')
            );

            const snapshot = await getDocs(q);
            return snapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    type: 'series' as const,
                    title: data.title || 'Serie sin título',
                    createdAt: data.createdAt?.toDate() || new Date(),
                    status: data.status || 'active',
                };
            });
        } catch (error) {
            console.error('Error fetching recent series:', error);
            return [];
        }
    }

    private async getRecentLibraryUploads(userId: string, since: Timestamp): Promise<ContentActivity[]> {
        try {
            const q = query(
                collection(this.db, this.libraryCollection),
                where('userId', '==', userId),
                where('createdAt', '>=', since),
                orderBy('createdAt', 'desc')
            );

            const snapshot = await getDocs(q);
            return snapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    type: 'library_upload' as const,
                    title: data.title || 'Recurso sin título',
                    createdAt: data.createdAt?.toDate() || new Date(),
                    status: data.status || 'active',
                };
            });
        } catch (error) {
            console.error('Error fetching recent library uploads:', error);
            return [];
        }
    }

    private async getRecentPlans(userId: string, since: Timestamp): Promise<ContentActivity[]> {
        try {
            const q = query(
                collection(this.db, this.plansCollection),
                where('userId', '==', userId),
                where('createdAt', '>=', since),
                orderBy('createdAt', 'desc')
            );

            const snapshot = await getDocs(q);
            return snapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    type: 'preaching_plan' as const,
                    title: data.title || 'Plan de predicación',
                    createdAt: data.createdAt?.toDate() || new Date(),
                    status: data.status || 'active',
                };
            });
        } catch (error) {
            console.error('Error fetching recent plans:', error);
            return [];
        }
    }

    private getCollectionForType(type: ContentActivity['type']): string {
        switch (type) {
            case 'sermon':
                return this.sermonsCollection;
            case 'greek_session':
                return this.greekSessionsCollection;
            case 'series':
                return this.seriesCollection;
            case 'library_upload':
                return this.libraryCollection;
            case 'preaching_plan':
                return this.plansCollection;
            default:
                throw new Error(`Unknown content type: ${type}`);
        }
    }

    private mapToContentActivity(data: any, type: ContentActivity['type']): ContentActivity {
        return {
            id: data.id || '',
            type,
            title: data.title || data.passage || 'Sin título',
            createdAt: data.createdAt?.toDate() || new Date(),
            status: data.status || data.isCompleted ? 'completed' : 'active',
        };
    }

    // Helper methods to count real data
    private async countUserSermons(userId: string, status?: string): Promise<number> {
        try {
            let q = query(
                collection(this.db, this.sermonsCollection),
                where('userId', '==', userId)
            );

            if (status) {
                q = query(q, where('status', '==', status));
            }

            const snapshot = await getDocs(q);
            return snapshot.size;
        } catch (error) {
            console.error('Error counting sermons:', error);
            return 0;
        }
    }

    private async countUserGreekSessions(userId: string, completedOnly?: boolean): Promise<number> {
        try {
            let q = query(
                collection(this.db, this.greekSessionsCollection),
                where('userId', '==', userId)
            );

            if (completedOnly) {
                q = query(q, where('isCompleted', '==', true));
            }

            const snapshot = await getDocs(q);
            return snapshot.size;
        } catch (error) {
            console.error('Error counting Greek sessions:', error);
            return 0;
        }
    }

    private async countUserSeries(userId: string): Promise<number> {
        try {
            const q = query(
                collection(this.db, this.seriesCollection),
                where('userId', '==', userId)
            );
            const snapshot = await getDocs(q);
            return snapshot.size;
        } catch (error) {
            console.error('Error counting series:', error);
            return 0;
        }
    }

    private async countUserLibraryUploads(userId: string): Promise<number> {
        try {
            const q = query(
                collection(this.db, this.libraryCollection),
                where('userId', '==', userId)
            );
            const snapshot = await getDocs(q);
            return snapshot.size;
        } catch (error) {
            console.error('Error counting library uploads:', error);
            return 0;
        }
    }

    private async countUserPreachingPlans(userId: string): Promise<number> {
        try {
            const q = query(
                collection(this.db, this.plansCollection),
                where('userId', '==', userId)
            );
            const snapshot = await getDocs(q);
            return snapshot.size;
        } catch (error) {
            console.error('Error counting preaching plans:', error);
            return 0;
        }
    }
}
