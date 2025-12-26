/**
 * Geographic Event Tracking
 * 
 * Entities and types for tracking user events with geographic information
 * to analyze traffic sources, conversions, and user distribution.
 */

export type EventType = 'landing_visit' | 'registration' | 'login';

export interface GeoLocation {
    country: string;
    countryCode: string; // ISO 3166-1 alpha-2 (e.g., "US", "CL")
    region: string;
    city: string;
    lat: number;
    lon: number;
    timezone?: string;
    isp?: string;
}

export interface GeoEvent {
    id: string;
    type: EventType;
    timestamp: Date;

    // User info (optional for anonymous landing visits)
    userId?: string;
    userEmail?: string;

    // Request metadata
    ipAddress: string;
    location: GeoLocation;
    userAgent?: string;
    referrer?: string;

    // Timestamps
    createdAt: Date;
}

export interface GeoEventFilters {
    type?: EventType;
    country?: string;
    countryCode?: string;
    startDate?: Date;
    endDate?: Date;
    userId?: string;
}

/**
 * Country-level summary of events
 */
export interface CountrySummary {
    country: string;
    countryCode: string;
    landingVisits: number;
    registrations: number;
    logins: number;
    conversionRate: number; // registrations / landingVisits
    activationRate: number; // logins / registrations
}

/**
 * Conversion funnel metrics
 */
export interface FunnelMetrics {
    landingVisits: number;
    registrations: number;
    logins: number;
    visitToRegistration: number; // %
    registrationToLogin: number; // %
    overallConversion: number; // %
}

/**
 * Daily time series data point
 */
export interface DailyMetric {
    date: Date;
    landingVisits: number;
    registrations: number;
    logins: number;
}
