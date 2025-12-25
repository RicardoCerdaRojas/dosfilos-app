import { GeoEvent, GeoEventFilters, CountrySummary, FunnelMetrics, DailyMetric } from '../entities/GeoEvent';

/**
 * Repository interface for geographic event tracking
 * 
 * Handles storage and retrieval of user events with geographic data
 * for analytics and conversion tracking.
 */
export interface IGeoEventRepository {
    /**
     * Track a new geographic event
     */
    trackEvent(event: Omit<GeoEvent, 'id' | 'createdAt'>): Promise<void>;

    /**
     * Get events with optional filtering
     */
    getEvents(filters?: GeoEventFilters, limit?: number): Promise<GeoEvent[]>;

    /**
     * Get country-level summary for a date range
     */
    getCountrySummary(startDate: Date, endDate: Date): Promise<CountrySummary[]>;

    /**
     * Get conversion funnel metrics
     */
    getConversionFunnel(startDate: Date, endDate: Date): Promise<FunnelMetrics>;

    /**
     * Get daily time series data
     */
    getDailyMetrics(startDate: Date, endDate: Date): Promise<DailyMetric[]>;

    /**
     * Get total event counts by type
     */
    getEventCounts(startDate: Date, endDate: Date, filters?: Pick<GeoEventFilters, 'country' | 'countryCode'>): Promise<{
        landing_visit: number;
        registration: number;
        login: number;
    }>;
}
