import { IGeoEventRepository } from '@dosfilos/domain';

/**
 * Get Geographic Analytics
 * 
 * Fetches aggregated geographic analytics data including:
 * - Conversion funnel metrics
 * - Country-level summaries
 * - Daily time series
 */
export class GetGeoAnalytics {
    constructor(private geoEventRepo: IGeoEventRepository) { }

    async execute(startDate: Date, endDate: Date) {
        const [funnel, countrySummary, dailyMetrics] = await Promise.all([
            this.geoEventRepo.getConversionFunnel(startDate, endDate),
            this.geoEventRepo.getCountrySummary(startDate, endDate),
            this.geoEventRepo.getDailyMetrics(startDate, endDate),
        ]);

        return {
            funnel,
            countrySummary,
            dailyMetrics,
            dateRange: {
                start: startDate,
                end: endDate,
            },
        };
    }
}
