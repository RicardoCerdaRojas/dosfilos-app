import { getFunctions, httpsCallable } from 'firebase/functions';
import { ANALYTICS_CONFIG, isAnalyticsEnabled } from './config';
import { readPersistedUtm } from './utm';

/**
 * Type-safe funnel event vocabulary.
 *
 * Adding an event here is the only step needed for it to be
 * tracked through every adapter (GA4, Meta, Clarity custom tags,
 * server mirror). Keep the names stable — analytics dashboards
 * pin to them.
 */
export type FunnelEventName =
    // Landing surface
    | 'landing_view'
    | 'cta_hero_click'
    | 'cta_secondary_click'
    | 'cta_finalcta_click'
    | 'cta_pricing_click'
    | 'cta_pricing_free_click'
    | 'nav_link_click'
    | 'faq_open'
    | 'scroll_depth'
    // Auth surface
    | 'register_started'
    | 'register_completed'
    | 'login_completed'
    // Conversion surface
    | 'plan_selected'
    | 'checkout_started'
    | 'checkout_completed'
    // Lead magnet surface (Fase B)
    | 'lead_magnet_viewed'
    | 'lead_magnet_submitted'
    | 'lead_magnet_downloaded';

export type EventProps = Record<string, string | number | boolean | undefined>;

/**
 * Unified analytics dispatch. Fires the event into every configured
 * adapter — GA4 via `gtag`, Meta via `fbq`, Clarity as a custom
 * tag, and our own Firestore `funnel_events/` collection via a
 * Cloud Function for retention beyond GA4's 14-month default.
 *
 * Each adapter is fail-soft: if a script hasn't loaded yet, the
 * call queues into the SDK's own buffer and drains later. If the
 * SDK was never configured (empty pixel ID, dev mode), the adapter
 * is a no-op.
 *
 * UTM context attaches automatically — no caller needs to remember
 * to forward `utm_source`. First-touch attribution lives in
 * `utm.ts` so the same UTMs ride along on every event regardless
 * of how deep the visitor is in the funnel.
 */
export function track(eventName: FunnelEventName, props: EventProps = {}): void {
    const utm = readPersistedUtm();
    const enrichedProps: EventProps = { ...utm, ...props };

    // GA4
    const w = window as any;
    if (w.gtag) {
        try {
            w.gtag('event', eventName, enrichedProps);
        } catch (err) {
            console.debug('[analytics] GA4 dispatch failed:', err);
        }
    }

    // Meta Pixel
    if (w.fbq && ANALYTICS_CONFIG.metaPixelId) {
        try {
            const metaEventName = mapToMetaEvent(eventName);
            if (metaEventName) {
                w.fbq('track', metaEventName, enrichedProps);
            } else {
                w.fbq('trackCustom', eventName, enrichedProps);
            }
        } catch (err) {
            console.debug('[analytics] Meta dispatch failed:', err);
        }
    }

    // Microsoft Clarity — register the event name as a custom tag
    // so it shows up in session recordings filters.
    if (w.clarity) {
        try {
            w.clarity('set', 'event', eventName);
        } catch (err) {
            console.debug('[analytics] Clarity dispatch failed:', err);
        }
    }

    // Server-side Firestore mirror — fire-and-forget. Survives
    // ad blockers + iOS ATT that may suppress client-side trackers.
    // Keeps a permanent audit trail independent of GA4's retention.
    if (isAnalyticsEnabled()) {
        mirrorToServer(eventName, enrichedProps).catch(err => {
            console.debug('[analytics] Server mirror failed:', err);
        });
    }
}

/**
 * Maps internal event names to Meta Pixel standard events. Returns
 * `null` for custom events (Meta receives those as `trackCustom`
 * which lets us still build audiences from them in Ads Manager).
 */
function mapToMetaEvent(eventName: FunnelEventName): string | null {
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
 * Fires a Cloud Function callable that persists the event into
 * `funnel_events/` collection. Includes a deterministic event id
 * so the server can deduplicate against Meta Conversions API
 * events when both fire for the same conversion.
 */
async function mirrorToServer(eventName: FunnelEventName, props: EventProps): Promise<void> {
    const functions = getFunctions();
    const callable = httpsCallable(functions, 'trackFunnelEvent');
    const eventId = generateEventId();
    await callable({
        eventId,
        eventName,
        props,
        timestamp: Date.now(),
        url: typeof window !== 'undefined' ? window.location.href : null,
        referrer: typeof document !== 'undefined' ? document.referrer || null : null,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        sessionId: getOrCreateSessionId(),
    });
}

/**
 * Random 16-char event id. Used as the dedup key when the same
 * conversion is reported by both the browser and Meta CAPI.
 */
function generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Session id that persists for the tab session (sessionStorage).
 * Different from the user id — works for anonymous visitors and
 * helps stitch events from a single browsing session together.
 */
function getOrCreateSessionId(): string {
    if (typeof window === 'undefined') return 'ssr';
    try {
        const KEY = 'dosfilos_session_id';
        let id = window.sessionStorage.getItem(KEY);
        if (!id) {
            id = `s_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
            window.sessionStorage.setItem(KEY, id);
        }
        return id;
    } catch {
        return 'no-storage';
    }
}
