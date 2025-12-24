import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    query,
    where,
    orderBy,
    limit as firestoreLimit,
    Timestamp
} from 'firebase/firestore';
import { IAnalyticsRepository, DailyMetrics, DailyMetricsEntity, UserActivity } from '@dosfilos/domain';
import { db } from '../config/firebase';

/**
 * Firebase implementation of analytics repository
 * Handles persistence of user activities and daily metrics
 */
export class FirebaseAnalyticsRepository implements IAnalyticsRepository {
    private readonly activitiesCollection = 'user_activities';
    private readonly metricsCollection = 'daily_metrics';

    /**
     * Track a user activity session
     */
    async trackActivity(activity: UserActivity): Promise<void> {
        const activityRef = doc(db, this.activitiesCollection, activity.id);

        const activityData = {
            ...activity,
            startTime: Timestamp.fromDate(activity.startTime),
            endTime: activity.endTime ? Timestamp.fromDate(activity.endTime) : null,
            createdAt: Timestamp.fromDate(activity.createdAt),
            events: activity.events.map(event => ({
                ...event,
                timestamp: Timestamp.fromDate(event.timestamp)
            }))
        };

        await setDoc(activityRef, activityData);
    }

    /**
     * Get user activities for a specific user
     */
    async getUserActivities(userId: string, limit: number = 50): Promise<UserActivity[]> {
        const q = query(
            collection(db, this.activitiesCollection),
            where('userId', '==', userId),
            orderBy('startTime', 'desc'),
            firestoreLimit(limit)
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => this.mapActivityFromFirestore(doc.data()));
    }

    /**
     * Get daily metrics for a specific date
     */
    async getDailyMetrics(date: Date): Promise<DailyMetrics | null> {
        const dateId = DailyMetricsEntity.formatDateId(date);
        const metricsRef = doc(db, this.metricsCollection, dateId);
        const snapshot = await getDoc(metricsRef);

        if (!snapshot.exists()) {
            return null;
        }

        return this.mapMetricsFromFirestore(snapshot.data());
    }

    /**
     * Get daily metrics for a date range
     */
    async getDailyMetricsRange(startDate: Date, endDate: Date): Promise<DailyMetrics[]> {
        const q = query(
            collection(db, this.metricsCollection),
            where('date', '>=', Timestamp.fromDate(startDate)),
            where('date', '<=', Timestamp.fromDate(endDate)),
            orderBy('date', 'desc')
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => this.mapMetricsFromFirestore(doc.data()));
    }

    /**
     * Save or update daily metrics
     */
    async saveDailyMetrics(metrics: DailyMetrics): Promise<void> {
        const metricsRef = doc(db, this.metricsCollection, metrics.id);

        const metricsData = {
            ...metrics,
            date: Timestamp.fromDate(metrics.date),
            createdAt: Timestamp.fromDate(metrics.createdAt),
            updatedAt: Timestamp.fromDate(metrics.updatedAt)
        };

        await setDoc(metricsRef, metricsData, { merge: true });
    }

    /**
     * Get the latest N days of metrics
     */
    async getLatestMetrics(days: number): Promise<DailyMetrics[]> {
        const q = query(
            collection(db, this.metricsCollection),
            orderBy('date', 'desc'),
            firestoreLimit(days)
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => this.mapMetricsFromFirestore(doc.data()));
    }

    /**
     * Calculate Daily Active Users (DAU) for a specific date
     */
    async calculateDAU(date: Date): Promise<number> {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const q = query(
            collection(db, this.activitiesCollection),
            where('startTime', '>=', Timestamp.fromDate(startOfDay)),
            where('startTime', '<=', Timestamp.fromDate(endOfDay))
        );

        const snapshot = await getDocs(q);

        // Get unique user IDs
        const uniqueUsers = new Set(snapshot.docs.map(doc => doc.data().userId));
        return uniqueUsers.size;
    }

    /**
     * Calculate Weekly Active Users (WAU) for a specific date
     */
    async calculateWAU(date: Date): Promise<number> {
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);

        const startDate = new Date(date);
        startDate.setDate(startDate.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);

        const q = query(
            collection(db, this.activitiesCollection),
            where('startTime', '>=', Timestamp.fromDate(startDate)),
            where('startTime', '<=', Timestamp.fromDate(endDate))
        );

        const snapshot = await getDocs(q);

        // Get unique user IDs
        const uniqueUsers = new Set(snapshot.docs.map(doc => doc.data().userId));
        return uniqueUsers.size;
    }

    /**
     * Calculate Monthly Active Users (MAU) for a specific date
     */
    async calculateMAU(date: Date): Promise<number> {
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);

        const startDate = new Date(date);
        startDate.setDate(startDate.getDate() - 29);
        startDate.setHours(0, 0, 0, 0);

        const q = query(
            collection(db, this.activitiesCollection),
            where('startTime', '>=', Timestamp.fromDate(startDate)),
            where('startTime', '<=', Timestamp.fromDate(endDate))
        );

        const snapshot = await getDocs(q);

        // Get unique user IDs
        const uniqueUsers = new Set(snapshot.docs.map(doc => doc.data().userId));
        return uniqueUsers.size;
    }

    /**
     * Map Firestore data to UserActivity entity
     */
    private mapActivityFromFirestore(data: any): UserActivity {
        return {
            id: data.id,
            userId: data.userId,
            sessionId: data.sessionId,
            startTime: data.startTime.toDate(),
            endTime: data.endTime?.toDate(),
            duration: data.duration,
            events: data.events.map((event: any) => ({
                ...event,
                timestamp: event.timestamp.toDate()
            })),
            deviceInfo: data.deviceInfo,
            pagesVisited: data.pagesVisited,
            actionsPerformed: data.actionsPerformed,
            createdAt: data.createdAt.toDate()
        };
    }

    /**
     * Map Firestore data to DailyMetrics entity
     */
    private mapMetricsFromFirestore(data: any): DailyMetrics {
        return {
            id: data.id,
            date: data.date.toDate(),
            totalUsers: data.totalUsers,
            activeUsers: data.activeUsers,
            newUsers: data.newUsers,
            totalSessions: data.totalSessions,
            avgSessionDuration: data.avgSessionDuration,
            totalSermonsCreated: data.totalSermonsCreated,
            totalAIGenerations: data.totalAIGenerations,
            mrr: data.mrr,
            newSubscriptions: data.newSubscriptions,
            cancelledSubscriptions: data.cancelledSubscriptions,
            upgrades: data.upgrades,
            downgrades: data.downgrades,
            usersByPlan: data.usersByPlan,
            dau: data.dau,
            wau: data.wau,
            mau: data.mau,
            createdAt: data.createdAt.toDate(),
            updatedAt: data.updatedAt.toDate()
        };
    }
}
