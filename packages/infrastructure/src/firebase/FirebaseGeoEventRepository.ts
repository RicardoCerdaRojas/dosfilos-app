import {
    Firestore,
    collection,
    addDoc,
    query,
    where,
    getDocs,
    orderBy,
    Timestamp,
    limit as firestoreLimit,
} from 'firebase/firestore';
import {
    IGeoEventRepository,
    GeoEvent,
    GeoEventFilters,
    CountrySummary,
    FunnelMetrics,
    DailyMetric,
} from '@dosfilos/domain';

/**
 * Firebase implementation of IGeoEventRepository
 * 
 * Stores geographic events in Firestore for analytics tracking
 */
export class FirebaseGeoEventRepository implements IGeoEventRepository {
    private readonly collectionName = 'geo_events';

    constructor(private db: Firestore) { }

    async trackEvent(event: Omit<GeoEvent, 'id' | 'createdAt'>): Promise<void> {
        try {
            const docData = {
                ...event,
                timestamp: Timestamp.fromDate(event.timestamp),
                createdAt: Timestamp.now(),
            };

            await addDoc(collection(this.db, this.collectionName), docData);
        } catch (error) {
            console.error('[FirebaseGeoEventRepository] Error tracking event:', error);
            throw error;
        }
    }

    async getEvents(filters?: GeoEventFilters, limit: number = 100): Promise<GeoEvent[]> {
        try {
            let q = query(collection(this.db, this.collectionName));

            // Apply filters
            if (filters?.type) {
                q = query(q, where('type', '==', filters.type));
            }

            if (filters?.country) {
                q = query(q, where('location.country', '==', filters.country));
            }

            if (filters?.countryCode) {
                q = query(q, where('location.countryCode', '==', filters.countryCode));
            }

            if (filters?.userId) {
                q = query(q, where('userId', '==', filters.userId));
            }

            if (filters?.startDate) {
                q = query(q, where('timestamp', '>=', Timestamp.fromDate(filters.startDate)));
            }

            if (filters?.endDate) {
                q = query(q, where('timestamp', '<=', Timestamp.fromDate(filters.endDate)));
            }

            // Order by timestamp descending and limit
            q = query(q, orderBy('timestamp', 'desc'), firestoreLimit(limit));

            const snapshot = await getDocs(q);

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                timestamp: doc.data().timestamp?.toDate() || new Date(),
                createdAt: doc.data().createdAt?.toDate() || new Date(),
            } as GeoEvent));
        } catch (error) {
            console.error('[FirebaseGeoEventRepository] Error getting events:', error);
            return [];
        }
    }

    async getCountrySummary(startDate: Date, endDate: Date): Promise<CountrySummary[]> {
        try {
            // Get all events in date range
            const events = await this.getEvents({
                startDate,
                endDate,
            }, 10000); // High limit for aggregation

            // Group by country
            const countryMap = new Map<string, {
                countryCode: string;
                visits: number;
                registrations: number;
                logins: number;
            }>();

            events.forEach(event => {
                const country = event.location.country;
                const code = event.location.countryCode;

                if (!countryMap.has(country)) {
                    countryMap.set(country, {
                        countryCode: code,
                        visits: 0,
                        registrations: 0,
                        logins: 0,
                    });
                }

                const stats = countryMap.get(country)!;
                if (event.type === 'landing_visit') stats.visits++;
                if (event.type === 'registration') stats.registrations++;
                if (event.type === 'login') stats.logins++;
            });

            // Convert to CountrySummary array
            const summaries: CountrySummary[] = [];
            countryMap.forEach((stats, country) => {
                const conversionRate = stats.visits > 0
                    ? (stats.registrations / stats.visits) * 100
                    : 0;
                const activationRate = stats.registrations > 0
                    ? (stats.logins / stats.registrations) * 100
                    : 0;

                summaries.push({
                    country,
                    countryCode: stats.countryCode,
                    landingVisits: stats.visits,
                    registrations: stats.registrations,
                    logins: stats.logins,
                    conversionRate,
                    activationRate,
                });
            });

            // Sort by landing visits descending
            return summaries.sort((a, b) => b.landingVisits - a.landingVisits);
        } catch (error) {
            console.error('[FirebaseGeoEventRepository] Error getting country summary:', error);
            return [];
        }
    }

    async getConversionFunnel(startDate: Date, endDate: Date): Promise<FunnelMetrics> {
        try {
            const counts = await this.getEventCounts(startDate, endDate);

            const visitToRegistration = counts.landing_visit > 0
                ? (counts.registration / counts.landing_visit) * 100
                : 0;

            const registrationToLogin = counts.registration > 0
                ? (counts.login / counts.registration) * 100
                : 0;

            const overallConversion = counts.landing_visit > 0
                ? (counts.login / counts.landing_visit) * 100
                : 0;

            return {
                landingVisits: counts.landing_visit,
                registrations: counts.registration,
                logins: counts.login,
                visitToRegistration,
                registrationToLogin,
                overallConversion,
            };
        } catch (error) {
            console.error('[FirebaseGeoEventRepository] Error getting funnel metrics:', error);
            return {
                landingVisits: 0,
                registrations: 0,
                logins: 0,
                visitToRegistration: 0,
                registrationToLogin: 0,
                overallConversion: 0,
            };
        }
    }

    async getDailyMetrics(startDate: Date, endDate: Date): Promise<DailyMetric[]> {
        try {
            const events = await this.getEvents({ startDate, endDate }, 10000);

            // Group by date
            const dateMap = new Map<string, {
                visits: number;
                registrations: number;
                logins: number;
            }>();

            events.forEach(event => {
                const dateKey = event.timestamp.toISOString().split('T')[0]; // YYYY-MM-DD

                if (!dateMap.has(dateKey)) {
                    dateMap.set(dateKey, { visits: 0, registrations: 0, logins: 0 });
                }

                const stats = dateMap.get(dateKey)!;
                if (event.type === 'landing_visit') stats.visits++;
                if (event.type === 'registration') stats.registrations++;
                if (event.type === 'login') stats.logins++;
            });

            // Convert to array and sort by date
            const metrics = Array.from(dateMap.entries())
                .map(([dateStr, stats]) => ({
                    date: new Date(dateStr),
                    landingVisits: stats.visits,
                    registrations: stats.registrations,
                    logins: stats.logins,
                }))
                .sort((a, b) => a.date.getTime() - b.date.getTime());

            return metrics;
        } catch (error) {
            console.error('[FirebaseGeoEventRepository] Error getting daily metrics:', error);
            return [];
        }
    }

    async getEventCounts(
        startDate: Date,
        endDate: Date,
        filters?: Pick<GeoEventFilters, 'country' | 'countryCode'>
    ): Promise<{ landing_visit: number; registration: number; login: number }> {
        try {
            const events = await this.getEvents({
                startDate,
                endDate,
                ...filters,
            }, 10000);

            const counts = {
                landing_visit: 0,
                registration: 0,
                login: 0,
            };

            events.forEach(event => {
                counts[event.type]++;
            });

            return counts;
        } catch (error) {
            console.error('[FirebaseGeoEventRepository] Error getting event counts:', error);
            return {
                landing_visit: 0,
                registration: 0,
                login: 0,
            };
        }
    }
}
