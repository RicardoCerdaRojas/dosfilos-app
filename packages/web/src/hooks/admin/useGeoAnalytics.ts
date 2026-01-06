import { useState, useEffect } from 'react';
import { db, FirebaseGeoEventRepository } from '@dosfilos/infrastructure';
import { GetGeoAnalytics } from '@dosfilos/application';
import { FunnelMetrics, CountrySummary, DailyMetric } from '@dosfilos/domain';

export type DateRange = '7d' | '30d' | '90d' | 'custom';

interface UseGeoAnalyticsResult {
    funnel: FunnelMetrics | null;
    countrySummary: CountrySummary[];
    dailyMetrics: DailyMetric[];
    loading: boolean;
    error: string | null;
    dateRange: DateRange;
    setDateRange: (range: DateRange) => void;
    customDates: { start: Date; end: Date } | null;
    setCustomDates: (dates: { start: Date; end: Date }) => void;
}

/**
 * Hook to fetch and manage geographic analytics data
 */
export function useGeoAnalytics(): UseGeoAnalyticsResult {
    const [funnel, setFunnel] = useState<FunnelMetrics | null>(null);
    const [countrySummary, setCountrySummary] = useState<CountrySummary[]>([]);
    const [dailyMetrics, setDailyMetrics] = useState<DailyMetric[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState<DateRange>('30d');
    const [customDates, setCustomDates] = useState<{ start: Date; end: Date } | null>(null);

    useEffect(() => {
        fetchAnalytics();
    }, [dateRange, customDates]);

    const getDateRangeDates = (): { start: Date; end: Date } => {
        const end = new Date();
        const start = new Date();

        if (dateRange === 'custom' && customDates) {
            return customDates;
        }

        switch (dateRange) {
            case '7d':
                start.setDate(start.getDate() - 7);
                break;
            case '30d':
                start.setDate(start.getDate() - 30);
                break;
            case '90d':
                start.setDate(start.getDate() - 90);
                break;
        }

        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        return { start, end };
    };

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            setError(null);

            const { start, end } = getDateRangeDates();

            // Initialize repository and use case
            const geoEventRepo = new FirebaseGeoEventRepository(db);
            const getGeoAnalytics = new GetGeoAnalytics(geoEventRepo);

            // Fetch data
            const data = await getGeoAnalytics.execute(start, end);

            setFunnel(data.funnel);
            setCountrySummary(data.countrySummary);
            setDailyMetrics(data.dailyMetrics);
        } catch (err) {
            console.error('[useGeoAnalytics] Error fetching analytics:', err);
            setError(err instanceof Error ? err.message : 'Error al cargar analytics');
        } finally {
            setLoading(false);
        }
    };

    return {
        funnel,
        countrySummary,
        dailyMetrics,
        loading,
        error,
        dateRange,
        setDateRange,
        customDates,
        setCustomDates,
    };
}
