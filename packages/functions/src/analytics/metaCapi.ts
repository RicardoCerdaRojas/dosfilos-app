import * as crypto from 'crypto';

/**
 * Meta Conversions API (CAPI) dispatch — server-to-server pixel
 * events that bypass iOS ATT, ad blockers, and any browser-side
 * tracking suppression.
 *
 * Pairs with the client-side `fbq` Pixel via a shared `event_id`
 * (same one the browser sent, plumbed through the
 * `trackFunnelEvent` callable). Meta dedups based on that id so
 * a conversion reported by both paths counts once, not twice.
 *
 * Reference: https://developers.facebook.com/docs/marketing-api/conversions-api
 */

const GRAPH_API_VERSION = 'v18.0';

export interface MetaCapiEventInput {
    /** Internal funnel event name — mapped to Meta standard names below. */
    eventName: string;
    /** Deterministic dedup id shared with the browser pixel. */
    eventId: string;
    /** Client timestamp in ms (we convert to seconds for Meta). */
    timestampMs: number;
    /** Page URL where the event fired. */
    sourceUrl: string | null;
    /** Visitor IP (from x-forwarded-for in the callable). */
    ip: string | null;
    /** Browser user agent. */
    userAgent: string | null;
    /** Custom data forwarded to Meta — UTMs land here. */
    customData: Record<string, string | number | boolean | null>;
    /**
     * Hashed email if available — significantly improves match
     * quality for Lead / Purchase events. SHA256 of lowercased email.
     */
    hashedEmail?: string;
}

/**
 * Maps internal funnel event names to Meta standard events.
 * Standard events are required for Ads Manager optimization and
 * Aggregated Event Measurement (post-iOS 14). Custom names fall
 * through as `null` so the caller can decide whether to send
 * them as a custom event or skip.
 */
function mapToMetaStandardEvent(eventName: string): string | null {
    switch (eventName) {
        case 'landing_view':
            return 'PageView';
        case 'register_started':
            return 'InitiateCheckout';
        case 'register_completed':
            return 'CompleteRegistration';
        case 'checkout_started':
            return 'InitiateCheckout';
        case 'checkout_completed':
            return 'Purchase';
        case 'lead_magnet_submitted':
            return 'Lead';
        case 'plan_selected':
            return 'AddToCart';
        default:
            return null;
    }
}

/**
 * Dispatches a single event to Meta Conversions API. Fail-soft:
 * logs and returns on error so a CAPI outage doesn't break the
 * Firestore write that called us.
 *
 * No-op when env vars are missing (e.g. dev environment without
 * Meta credentials). The function check makes this safe to call
 * unconditionally from trackFunnelEvent / captureLead.
 */
export async function dispatchToMetaCapi(input: MetaCapiEventInput): Promise<void> {
    const pixelId = process.env.META_PIXEL_ID;
    const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
    if (!pixelId || !accessToken) {
        return; // CAPI not configured — silent no-op
    }

    // Send custom events through `trackCustom` semantics (Meta
    // accepts any name; standard names get optimized treatment).
    const standardEvent = mapToMetaStandardEvent(input.eventName);
    const eventName = standardEvent ?? input.eventName;

    // Meta expects timestamps in SECONDS, not milliseconds.
    const eventTime = Math.floor(input.timestampMs / 1000);

    // Build user_data block. More fields = better match quality,
    // but we only have what the browser shared. IP + UA + hashed
    // email is the minimum recommended set for Lead events.
    const userData: Record<string, unknown> = {};
    if (input.ip) userData.client_ip_address = input.ip;
    if (input.userAgent) userData.client_user_agent = input.userAgent;
    if (input.hashedEmail) userData.em = [input.hashedEmail];

    const event: Record<string, unknown> = {
        event_name: eventName,
        event_time: eventTime,
        event_id: input.eventId,
        action_source: 'website',
        user_data: userData,
    };

    if (input.sourceUrl) event.event_source_url = input.sourceUrl;
    if (Object.keys(input.customData).length > 0) {
        event.custom_data = input.customData;
    }

    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${pixelId}/events`;
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                data: [event],
                access_token: accessToken,
            }),
        });
        if (!response.ok) {
            const body = await response.text();
            console.warn(`[metaCapi] non-2xx response (${response.status}): ${body.slice(0, 400)}`);
        }
    } catch (err: any) {
        console.warn('[metaCapi] dispatch failed:', err?.message ?? err);
    }
}

/**
 * SHA256 hash of a lowercased + trimmed email. Used for Meta's
 * `em` user_data field. The hash is one-way; Meta hashes its own
 * customer-list data the same way and compares hashes for match.
 */
export function hashEmail(email: string): string {
    return crypto
        .createHash('sha256')
        .update(email.trim().toLowerCase())
        .digest('hex');
}
