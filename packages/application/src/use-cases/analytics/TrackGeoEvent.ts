import { IGeoEventRepository, EventType, GeoEvent } from '@dosfilos/domain';
import { GeolocationService } from '@dosfilos/infrastructure';

interface TrackGeoEventInput {
    type: EventType;
    userId?: string;
    userEmail?: string;
    ipAddress: string;
    userAgent?: string;
    referrer?: string;
}

/**
 * Track Geographic Event
 * 
 * Records a user event (landing visit, registration, or login)
 * with geographic information derived from IP address
 */
export class TrackGeoEvent {
    constructor(
        private geoEventRepo: IGeoEventRepository,
        private geolocationService: GeolocationService
    ) { }

    async execute(input: TrackGeoEventInput): Promise<void> {
        try {
            // Get geographic location from IP
            const location = await this.geolocationService.getLocationByIP(input.ipAddress);

            if (!location) {
                console.warn('[TrackGeoEvent] Could not determine location for IP:', input.ipAddress);
                // Use default location for unknown IPs
                location: {
                    country: 'Unknown',
                        countryCode: 'XX',
                            region: '',
                                city: '',
                                    lat: 0,
                                        lon: 0,
                };
            }

            // Create event
            const event: Omit<GeoEvent, 'id' | 'createdAt'> = {
                type: input.type,
                timestamp: new Date(),
                userId: input.userId,
                userEmail: input.userEmail,
                ipAddress: input.ipAddress,
                location,
                userAgent: input.userAgent,
                referrer: input.referrer,
            };

            // Track event
            await this.geoEventRepo.trackEvent(event);
        } catch (error) {
            console.error('[TrackGeoEvent] Error tracking geo event:', error);
            // Don't throw - analytics failures shouldn't break app flow
        }
    }
}
