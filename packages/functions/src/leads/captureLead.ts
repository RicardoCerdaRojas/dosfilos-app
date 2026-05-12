import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { sendDeliveryEmail } from './leadMagnetMailer';

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
}

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
        region: 'us-central1',
        // RESEND_API_KEY is read from process.env to match the rest
        // of the email stack (sendVerificationEmail / EmailService /
        // sendWelcomeEmail). Firebase Functions v2 loads the value
        // from packages/functions/.env at deploy time. Migrating to
        // Secret Manager (`secrets: ['RESEND_API_KEY']`) is tracked
        // tech-debt for the whole email stack — not a per-function fix.
    },
    async (request) => {
        const { email, name, leadMagnet, utm, sessionId } = request.data;

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
