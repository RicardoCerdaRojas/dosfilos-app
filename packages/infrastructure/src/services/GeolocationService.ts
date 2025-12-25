import { GeoLocation } from '@dosfilos/domain';

/**
 * Geolocation Service
 * 
 * Converts IP addresses to geographic locations using IP-API.com
 * Free tier: 45 requests/minute, no API key required
 */
export class GeolocationService {
    private readonly API_URL = 'http://ip-api.com/json';

    /**
     * Get geographic location from IP address
     * @param ip - IPv4 or IPv6 address
     * @returns GeoLocation with country, city, coordinates, etc.
     */
    async getLocationByIP(ip: string): Promise<GeoLocation | null> {
        try {
            // IP-API.com endpoint
            const response = await fetch(`${this.API_URL}/${ip}?fields=status,message,country,countryCode,region,city,lat,lon,timezone,isp`);

            if (!response.ok) {
                console.error('[GeolocationService] API request failed:', response.status);
                return null;
            }

            const data = await response.json();

            // Check for API errors
            if (data.status === 'fail') {
                console.error('[GeolocationService] API returned error:', data.message);
                return null;
            }

            // Map API response to GeoLocation interface
            return {
                country: data.country || 'Unknown',
                countryCode: data.countryCode || 'XX',
                region: data.region || data.regionName || '',
                city: data.city || '',
                lat: data.lat || 0,
                lon: data.lon || 0,
                timezone: data.timezone,
                isp: data.isp,
            };
        } catch (error) {
            console.error('[GeolocationService] Error fetching location:', error);
            return null;
        }
    }

    /**
     * Get user's IP address from request headers (for server-side use)
     * Works with common proxy headers (Cloudflare, AWS, etc.)
     */
    static getClientIP(request: Request): string {
        // Check various headers for real IP (in order of precedence)
        const headers = request.headers;

        return (
            headers.get('cf-connecting-ip') ||  // Cloudflare
            headers.get('x-real-ip') ||         // Nginx
            headers.get('x-forwarded-for')?.split(',')[0] || // Standard proxy
            'unknown'
        );
    }

    /**
     * Validate IP address format
     */
    static isValidIP(ip: string): boolean {
        // Simple IPv4 regex
        const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
        // Simple IPv6 regex (basic check)
        const ipv6Regex = /^([0-9a-fA-F]{0,4}:){7}[0-9a-fA-F]{0,4}$/;

        return ipv4Regex.test(ip) || ipv6Regex.test(ip);
    }
}
