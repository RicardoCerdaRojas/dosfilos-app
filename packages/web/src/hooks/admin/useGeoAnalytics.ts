import { useState, useEffect } from 'react';
import { db, FirebaseGeoEventRepository } from '@dosfilos/infrastructure';
import { GetGeoAnalytics } from '@dosfilos/application';
import { FunnelMetrics, CountrySummary, DailyMetric } from '@dosfilos/domain';

export type DateRange = '7d' | '30d' | '90d' | 'custom';

/**
 * Percent change vs the same metric in the previous period of equal length.
 * `null` when prior period had 0 (avoids "Infinity%" / division-by-zero noise).
 */
export interface FunnelDeltas {
    landingVisits: number | null;
    registrations: number | null;
    logins: number | null;
    overallConversion: number | null;
}

interface UseGeoAnalyticsResult {
    funnel: FunnelMetrics | null;
    priorFunnel: FunnelMetrics | null;
    deltas: FunnelDeltas | null;
    countrySummary: CountrySummary[];
    dailyMetrics: DailyMetric[];
    loading: boolean;
    error: string | null;
    dateRange: DateRange;
    setDateRange: (range: DateRange) => void;
    customDates: { start: Date; end: Date } | null;
    setCustomDates: (dates: { start: Date; end: Date }) => void;
}

const DAYS_PER_RANGE: Record<Exclude<DateRange, 'custom'>, number> = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
};

function pctChange(current: number, prior: number): number | null {
    if (prior === 0) return null;
    return ((current - prior) / prior) * 100;
}

export function useGeoAnalytics(): UseGeoAnalyticsResult {
    const [funnel, setFunnel] = useState<FunnelMetrics | null>(null);
    const [priorFunnel, setPriorFunnel] = useState<FunnelMetrics | null>(null);
    const [deltas, setDeltas] = useState<FunnelDeltas | null>(null);
    const [countrySummary, setCountrySummary] = useState<CountrySummary[]>([]);
    const [dailyMetrics, setDailyMetrics] = useState<DailyMetric[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState<DateRange>('30d');
    const [customDates, setCustomDates] = useState<{ start: Date; end: Date } | null>(null);

    useEffect(() => {
        fetchAnalytics();
    }, [dateRange, customDates]);

    const getDateRangeDates = (): { start: Date; end: Date; priorStart: Date; priorEnd: Date } => {
        const end = new Date();
        const start = new Date();

        if (dateRange === 'custom' && customDates) {
            const span = customDates.end.getTime() - customDates.start.getTime();
            return {
                start: customDates.start,
                end: customDates.end,
                priorStart: new Date(customDates.start.getTime() - span),
                priorEnd: new Date(customDates.start.getTime() - 1),
            };
        }

        const days = DAYS_PER_RANGE[dateRange as Exclude<DateRange, 'custom'>] ?? 30;
        start.setDate(start.getDate() - days);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        // Prior period: same length, ending one day before the current `start`.
        const priorEnd = new Date(start.getTime() - 1);
        const priorStart = new Date(priorEnd);
        priorStart.setDate(priorStart.getDate() - days);
        priorStart.setHours(0, 0, 0, 0);

        return { start, end, priorStart, priorEnd };
    };

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            setError(null);

            const { start, end, priorStart, priorEnd } = getDateRangeDates();

            const geoEventRepo = new FirebaseGeoEventRepository(db);
            const getGeoAnalytics = new GetGeoAnalytics(geoEventRepo);

            // Fetch current + prior period funnels in parallel. Country + daily
            // breakdowns only come from the current period — comparisons live in
            // the strip hints, not the table.
            const [current, prior] = await Promise.all([
                getGeoAnalytics.execute(start, end),
                getGeoAnalytics.execute(priorStart, priorEnd),
            ]);

            setFunnel(current.funnel);
            setCountrySummary(current.countrySummary);
            setDailyMetrics(current.dailyMetrics);
            setPriorFunnel(prior.funnel);
            setDeltas({
                landingVisits: pctChange(current.funnel.landingVisits, prior.funnel.landingVisits),
                registrations: pctChange(current.funnel.registrations, prior.funnel.registrations),
                logins: pctChange(current.funnel.logins, prior.funnel.logins),
                overallConversion: pctChange(current.funnel.overallConversion, prior.funnel.overallConversion),
            });
        } catch (err) {
            console.error('[useGeoAnalytics] Error fetching analytics:', err);
            setError(err instanceof Error ? err.message : 'Error al cargar analytics');
        } finally {
            setLoading(false);
        }
    };

    return {
        funnel,
        priorFunnel,
        deltas,
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
