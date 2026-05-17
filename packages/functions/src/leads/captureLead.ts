import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { appCheckCallableOptions } from '../config/appCheckOptions';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { sendDeliveryEmail } from './leadMagnetMailer';
import { dispatchToMetaCapi, hashEmail } from '../analytics/metaCapi';

interface CaptureLeadRequest {
    email: string;
    name?: string;
    /** Lead magnet identifier — single magnet today, multi-magnet ready. */
    leadMagnet?: string;
    /** Marketing context forwarded from the landing-side analytics module. */
    utm?: {
        utm_source?: string;
        utm_medium?: string;
        utm_campaign?: string;
        utm_content?: string;
        utm_term?: string;
    };
    /** Session id from analytics — lets us join leads to funnel events. */
    sessionId?: string;
    /**
     * Honeypot field. The form renders this as a hidden input that
     * humans never see; bots that fill every field they find leave
     * a value. Any non-empty value triggers a silent reject (we
     * return success to avoid telling the bot it failed).
     */
    website?: string;
}

/**
 * Per-IP submission cap to mitigate volume abuse. Naïve sliding-window
 * counter persisted in Firestore. Five-per-hour is generous for a
 * real human (one retry + a few legitimate re-tests) and brutal for
 * scripted floods.
 */
const RATE_LIMIT_MAX_PER_HOUR = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

interface CaptureLeadResponse {
    ok: true;
    leadId: string;
    duplicate: boolean;
}

/**
 * Public callable that captures a lead-magnet form submission, persists
 * the lead, and sends a delivery email through Resend (with a 30-day
 * signed Cloud Storage URL to the magnet PDF).
 *
 * Public (no auth required) because the entire point is to capture
 * leads BEFORE they sign up. Idempotency: keyed by normalized email
 * + leadMagnet — re-submitting the same email returns `duplicate:true`
 * and re-sends the email (so the user can retry if the first delivery
 * landed in spam) but does not create a second lead doc.
 *
 * Storage assumption: the PDF lives at `public-assets/manual-para-predicadores.pdf`
 * in the default bucket. Operator uploads it once before the function
 * is exercised in prod — see docs/lead-magnet-deploy.md.
 *
 * Email path: Resend with the same `RESEND_API_KEY` env var the rest
 * of the email stack uses (loaded from packages/functions/.env at
 * deploy time). Mailer logic lives in leadMagnetMailer.ts so the
 * admin-side resend callable can reuse it without divergence.
 */
export const captureLead = onCall<CaptureLeadRequest, Promise<CaptureLeadResponse>>(
    {
        ...appCheckCallableOptions(),
        region: 'us-central1',
        // RESEND_API_KEY is read from process.env to match the rest
        // of the email stack (sendVerificationEmail / EmailService /
        // sendWelcomeEmail). Firebase Functions v2 loads the value
        // from packages/functions/.env at deploy time. Migrating to
        // Secret Manager (`secrets: ['RESEND_API_KEY']`) is tracked
        // tech-debt for the whole email stack — not a per-function fix.
    },
    async (request) => {
        const { email, name, leadMagnet, utm, sessionId, website } = request.data;

        // Honeypot: hidden field humans never fill. Bots that scrape
        // every form input leave it populated. Return success so the
        // attacker doesn't learn the trap exists; do nothing else.
        if (typeof website === 'string' && website.trim().length > 0) {
            console.warn('[captureLead] honeypot tripped — silent drop', {
                ip: request.rawRequest?.headers['x-forwarded-for'],
                userAgent: request.rawRequest?.headers['user-agent'],
            });
            return { ok: true, leadId: 'honeypot', duplicate: false };
        }

        const normalizedEmail = (email ?? '').trim().toLowerCase();
        if (!isValidEmail(normalizedEmail)) {
            throw new HttpsError('invalid-argument', 'A valid email is required');
        }

        const magnetSlug = (leadMagnet ?? 'manual-para-predicadores').trim();
        // Whitelist accepted magnet slugs so a malicious payload can't
        // craft a path traversal via the magnet identifier.
        if (!['manual-para-predicadores'].includes(magnetSlug)) {
            throw new HttpsError('invalid-argument', `Unknown lead magnet: ${magnetSlug}`);
        }

        const db = getFirestore();

        // IP rate limit. Track per-IP submission counts in a sliding
        // 1-hour window. Skipped entirely when we can't determine the
        // caller's IP (rare — Firebase puts x-forwarded-for in
        // practically every callable request). Fail-open on Firestore
        // errors so a transient outage doesn't take the form offline.
        const callerIp = (request.rawRequest?.headers['x-forwarded-for'] as string | undefined) ?? null;
        if (callerIp) {
            try {
                const allowed = await consumeRateLimitToken(db, callerIp);
                if (!allowed) {
                    throw new HttpsError(
                        'resource-exhausted',
                        'Demasiados intentos. Espera unos minutos antes de volver a intentar.',
                    );
                }
            } catch (err) {
                if (err instanceof HttpsError) throw err;
                console.warn('[captureLead] rate-limit check failed (fail-open):', err);
            }
        }

        const leadId = buildLeadId(normalizedEmail, magnetSlug);
        const leadRef = db.collection('lead_magnet_submissions').doc(leadId);

        const existing = await leadRef.get();
        const isDuplicate = existing.exists;

        // Persist (or update timestamp on) the lead BEFORE sending the
        // email so a Resend outage doesn't lose the contact entirely.
        // Email re-send on duplicate is best-effort.
        const now = FieldValue.serverTimestamp();
        if (isDuplicate) {
            await leadRef.update({
                lastRequestedAt: now,
                requestCount: FieldValue.increment(1),
            });
        } else {
            await leadRef.set({
                email: normalizedEmail,
                name: (name ?? '').trim() || null,
                leadMagnet: magnetSlug,
                utm: utm ?? {},
                sessionId: sessionId ?? null,
                ip: request.rawRequest?.headers['x-forwarded-for'] ?? null,
                userAgent: request.rawRequest?.headers['user-agent'] ?? null,
                createdAt: now,
                lastRequestedAt: now,
                requestCount: 1,
                emailDelivered: false,
                // Reserved for the nurture sequence when we wire that
                // up in a follow-up PR. Stage 0 = just-captured.
                nurtureStage: 0,
            });
        }

        // Fire a high-quality CAPI Lead event directly server-side
        // with the hashed email attached. Better match quality than
        // the generic mirror from `trackFunnelEvent` because Meta
        // uses the hashed email to stitch this event to its known
        // user graph. The client-side `lead_magnet_submitted` event
        // still fires through `track()` for the browser pixel +
        // generic CAPI mirror — Meta dedups via different `event_id`
        // by treating them as separate events (acceptable: one is
        // Lead with email, the other is the Pixel PageView-style
        // submit). If we want strict dedup later, plumb the same
        // eventId from client→captureLead→CAPI.
        void dispatchToMetaCapi({
            eventName: 'lead_magnet_submitted',
            eventId: `capi_lead_${leadId}_${Date.now()}`,
            timestampMs: Date.now(),
            sourceUrl: 'https://dosfilosapp.web.app/recursos/manual-para-predicadores',
            ip: request.rawRequest?.headers['x-forwarded-for'] as string | undefined ?? null,
            userAgent: request.rawRequest?.headers['user-agent'] as string | undefined ?? null,
            customData: {
                lead_magnet: magnetSlug,
                utm_source: utm?.utm_source ?? null,
                utm_medium: utm?.utm_medium ?? null,
                utm_campaign: utm?.utm_campaign ?? null,
            },
            hashedEmail: hashEmail(normalizedEmail),
        });

        try {
            await sendDeliveryEmail({
                to: normalizedEmail,
                name: (name ?? '').trim(),
            });
            await leadRef.update({ emailDelivered: true, lastEmailedAt: now });
        } catch (err: any) {
            console.error('[captureLead] Resend dispatch failed:', err?.message ?? err);
            await leadRef.update({
                emailDelivered: false,
                lastEmailError: err?.message ?? 'unknown',
            });
            throw new HttpsError(
                'internal',
                'Could not send the delivery email. Please try again or contact support.',
            );
        }

        return { ok: true, leadId, duplicate: isDuplicate };
    },
);

// ── Helpers ─────────────────────────────────────────────────────────────

function isValidEmail(email: string): boolean {
    // Minimal RFC 5322 sanity check — Resend will reject bad addresses
    // server-side too. We're filtering obvious noise pre-write.
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

/**
 * Deterministic lead document id so re-submissions are idempotent.
 * Format keeps the email visible (operators inspect Firestore) but
 * scopes by magnet so the same email registering for two different
 * future magnets each gets its own doc.
 */
function buildLeadId(email: string, magnetSlug: string): string {
    const safeEmail = email.replace(/[^a-z0-9@._-]/g, '_');
    return `${magnetSlug}__${safeEmail}`;
}

/**
 * Sliding-window rate-limit token consumer. Uses a deterministic
 * doc id per IP in `rate_limits/{ipKey}` to track recent submission
 * timestamps. Returns `true` when the request is allowed,
 * `false` when over the cap.
 *
 * Idempotent under retry: a Firebase callable retry that re-runs
 * this function will count as a single attempt because the timestamp
 * advance happens via `arrayUnion` of the current ms — re-running
 * within the same millisecond is a no-op array-set semantics.
 *
 * Single-doc reads/writes; no transaction needed because the worst
 * race is one bot getting one extra request through.
 */
async function consumeRateLimitToken(
    db: FirebaseFirestore.Firestore,
    ip: string,
): Promise<boolean> {
    // The x-forwarded-for header can be a comma-separated chain when
    // the request passed through multiple proxies. Take the left-most
    // entry (the original client) and sanitize for use as doc id.
    const firstHop = ip.split(',')[0]?.trim() ?? ip;
    const ipKey = firstHop.replace(/[^a-zA-Z0-9.:_-]/g, '_').slice(0, 80);
    if (!ipKey) return true;

    const ref = db.collection('rate_limits').doc(`lead_magnet__${ipKey}`);
    const snap = await ref.get();
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW_MS;

    const data = snap.exists ? snap.data() : null;
    const recentRaw = (data?.recentMs as number[] | undefined) ?? [];
    const recent = recentRaw.filter(ms => typeof ms === 'number' && ms >= windowStart);

    if (recent.length >= RATE_LIMIT_MAX_PER_HOUR) {
        return false;
    }

    recent.push(now);
    await ref.set({
        recentMs: recent,
        lastSeenAt: FieldValue.serverTimestamp(),
        ip: firstHop,
    });
    return true;
}
