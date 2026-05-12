import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

interface TrackFunnelEventRequest {
    /** Deterministic event id used to dedup against Meta CAPI later. */
    eventId: string;
    /** Funnel event name (matches the client-side FunnelEventName union). */
    eventName: string;
    /** Arbitrary key/value props enriched with UTM context client-side. */
    props?: Record<string, string | number | boolean | null | undefined>;
    /** Client timestamp in ms since epoch — server stamps its own too. */
    timestamp?: number;
    /** Page URL at time of fire. */
    url?: string | null;
    /** `document.referrer` at time of fire. */
    referrer?: string | null;
    /** User agent — useful for bot filtering. */
    userAgent?: string | null;
    /** Tab-session id from sessionStorage. */
    sessionId?: string | null;
}

/**
 * Callable that persists conversion-funnel events into Firestore
 * `funnel_events/{eventId}` so we retain a permanent audit trail
 * independent of GA4 (14-month retention default) and resilient to
 * client-side ad blockers / iOS ATT suppression.
 *
 * Permissions: NO auth required. This endpoint is intentionally
 * public because most funnel events fire BEFORE the visitor signs
 * up — landing_view, cta_hero_click, scroll_depth. Abuse mitigation
 * is rate-limit-by-IP at the platform level (Firebase functions
 * concurrency limits) plus the document id is provided by the
 * client as `eventId` which makes flood detection trivial later if
 * needed (counts of writes per session).
 *
 * Idempotency: `eventId` is the document id, so retrying the same
 * call (network flakiness) is safe — Firestore upserts. The dedup
 * key also lets us later match Meta CAPI server-to-server events
 * with their browser counterparts.
 */
export const trackFunnelEvent = onCall<TrackFunnelEventRequest>(
    { region: 'us-central1' },
    async (request) => {
        const { eventId, eventName, props, timestamp, url, referrer, userAgent, sessionId } = request.data;

        if (!eventId || typeof eventId !== 'string') {
            throw new HttpsError('invalid-argument', 'eventId is required');
        }
        if (!eventName || typeof eventName !== 'string') {
            throw new HttpsError('invalid-argument', 'eventName is required');
        }

        const db = getFirestore();
        const userId = request.auth?.uid ?? null;

        // Strip any undefined values from props — Firestore rejects
        // them and the client may forward them when env vars are
        // missing or optional fields are blank.
        const cleanProps: Record<string, string | number | boolean | null> = {};
        if (props && typeof props === 'object') {
            for (const [k, v] of Object.entries(props)) {
                if (v === undefined) continue;
                cleanProps[k] = v as string | number | boolean | null;
            }
        }

        await db.collection('funnel_events').doc(eventId).set({
            eventName,
            props: cleanProps,
            userId,
            sessionId: sessionId ?? null,
            clientTimestamp: typeof timestamp === 'number' ? timestamp : null,
            serverTimestamp: FieldValue.serverTimestamp(),
            url: url ?? null,
            referrer: referrer ?? null,
            userAgent: userAgent ?? null,
            // Country + IP are auto-attached by Firebase request context
            // when accessible. Use the X-Forwarded-For header (Firebase
            // sets it from Cloud Load Balancer) when present.
            ip: request.rawRequest?.headers['x-forwarded-for'] ?? null,
        });

        return { ok: true, eventId };
    },
);
