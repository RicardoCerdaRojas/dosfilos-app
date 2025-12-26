import * as admin from 'firebase-admin';
import { https } from 'firebase-functions';

const db = admin.firestore();

/**
 * Geographic location data
 */
interface GeoLocation {
    country: string;
    countryCode: string;
    city?: string;
    region?: string;
}

/**
 * Get geographic location from IP address using ip-api.com
 */
export async function getLocationFromIP(ip: string): Promise<GeoLocation | null> {
    try {
        // Skip for localhost/private IPs
        if (!ip || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
            return {
                country: 'Unknown',
                countryCode: 'XX',
                city: 'Unknown',
                region: 'Unknown',
            };
        }

        const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,city,regionName`);
        const data: any = await response.json();

        if (data.status === 'success') {
            return {
                country: data.country || 'Unknown',
                countryCode: data.countryCode || 'XX',
                city: data.city,
                region: data.regionName,
            };
        }

        console.warn('[getLocationFromIP] Failed to get location:', data);
        return null;
    } catch (error) {
        console.error('[getLocationFromIP] Error:', error);
        return null;
    }
}

/**
 * Track a geographic event in Firestore
 */
export async function trackGeoEvent(params: {
    type: 'landing_visit' | 'registration' | 'login';
    userId?: string;
    ip: string;
    userAgent?: string;
}): Promise<void> {
    try {
        const { type, userId, ip, userAgent } = params;

        // Get location from IP
        const location = await getLocationFromIP(ip);

        if (!location) {
            console.warn('[trackGeoEvent] Could not determine location, skipping');
            return;
        }

        // Create event document
        const eventData = {
            type,
            userId: userId || null,
            location,
            ip: anonymizeIP(ip), // Anonymize for privacy
            userAgent: userAgent || 'Unknown',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        await db.collection('geo_events').add(eventData);
        console.log(`[trackGeoEvent] Tracked ${type} event from ${location.country}`);
    } catch (error) {
        console.error('[trackGeoEvent] Error tracking event:', error);
        // Don't throw - geo tracking should not block main operations
    }
}

/**
 * Anonymize IP address for privacy (GDPR compliance)
 * Keeps first 3 octets, zeros out last octet
 */
function anonymizeIP(ip: string): string {
    const parts = ip.split('.');
    if (parts.length === 4) {
        return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
    }
    return 'anonymized';
}

/**
 * Extract IP address from Cloud Functions request context
 */
export function getClientIP(request: https.Request): string {
    // Try various headers that might contain the real IP
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
        const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
        return ips.split(',')[0].trim();
    }

    const realIP = request.headers['x-real-ip'];
    if (realIP) {
        return Array.isArray(realIP) ? realIP[0] : realIP;
    }

    return request.ip || '127.0.0.1';
}
