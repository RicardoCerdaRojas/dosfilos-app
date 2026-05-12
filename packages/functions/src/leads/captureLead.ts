import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { Resend } from 'resend';

const FROM_ADDRESS = 'Preach <hola@dosfilos.com>';
const STORAGE_BUCKET = 'dosfilosapp.firebasestorage.app';
const LEAD_MAGNET_STORAGE_PATH = 'public-assets/manual-para-predicadores.pdf';
const SIGNED_URL_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;
const SITE_URL = 'https://dosfilosapp.web.app';

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
 * the lead, generates a 30-day signed URL to the magnet PDF in Cloud
 * Storage, and sends a delivery email through Resend.
 *
 * Public (no auth required) because the entire point is to capture
 * leads BEFORE they sign up. Idempotency: keyed by normalized email
 * + leadMagnet — re-submitting the same email returns `duplicate:true`
 * and re-sends the email (so the user can retry if the first delivery
 * landed in spam) but does not create a second lead doc.
 *
 * Storage assumption: the PDF lives at `public-assets/manual-para-predicadores.pdf`
 * in the default bucket. Operator uploads it once via the Firebase
 * console or via gsutil before the function is exercised in prod —
 * see deploy instructions in the PR description.
 *
 * Email path: Resend with the same `RESEND_API_KEY` env var the
 * other email-sending functions read. Failures are surfaced to the
 * caller (we don't pretend success because the email is the entire
 * value the visitor is exchanging their email for).
 */
export const captureLead = onCall<CaptureLeadRequest, Promise<CaptureLeadResponse>>(
    {
        region: 'us-central1',
        secrets: ['RESEND_API_KEY'],
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
        const leadRef = db.collection('leads').doc(leadId);

        const existing = await leadRef.get();
        const isDuplicate = existing.exists;

        const downloadUrl = await generateSignedDownloadUrl();

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
                downloadUrl,
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

async function generateSignedDownloadUrl(): Promise<string> {
    const bucket = getStorage().bucket(STORAGE_BUCKET);
    const file = bucket.file(LEAD_MAGNET_STORAGE_PATH);
    const [url] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + SIGNED_URL_EXPIRY_MS,
    });
    return url;
}

async function sendDeliveryEmail({
    to,
    name,
    downloadUrl,
}: {
    to: string;
    name: string;
    downloadUrl: string;
}): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        throw new Error('RESEND_API_KEY environment variable is required');
    }
    const resend = new Resend(apiKey);

    const greeting = name ? `Hola ${name},` : 'Hola,';
    const subject = 'Tu manual de predicación expositiva';
    const html = renderEmailHtml({ greeting, downloadUrl });

    const result = await resend.emails.send({
        from: FROM_ADDRESS,
        to,
        subject,
        html,
    });

    if (result.error) {
        throw new Error(`Resend error: ${result.error.message}`);
    }
}

function renderEmailHtml({ greeting, downloadUrl }: { greeting: string; downloadUrl: string }): string {
    // Editorial dark palette mirrored from the landing — keeps the
    // brand consistent from ad → landing → email → product.
    return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Tu manual de predicación expositiva</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f5f5f4;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.06);">
          <tr>
            <td style="background:#020617;color:#ffffff;padding:32px 36px;">
              <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#a5b4fc;margin-bottom:12px;">Preach · DosFilos</div>
              <h1 style="margin:0;font-size:24px;line-height:1.2;font-weight:600;">Tu manual de predicación expositiva</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 36px;">
              <p style="font-size:16px;line-height:1.6;margin:0 0 16px 0;color:#0f172a;">${greeting}</p>
              <p style="font-size:15px;line-height:1.6;margin:0 0 20px 0;color:#334155;">
                Gracias por suscribirte. Aquí tienes el manual prometido —una guía práctica
                para preparar sermones expositivos con metodología histórico-gramatical,
                fidelidad al texto y orden en el proceso de estudio.
              </p>
              <p style="margin:32px 0;">
                <a href="${downloadUrl}"
                   style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:500;letter-spacing:0.01em;">
                  Descargar el manual (PDF)
                </a>
              </p>
              <p style="font-size:13px;color:#64748b;line-height:1.6;margin:0 0 28px 0;">
                El enlace estará activo durante 30 días. Si tienes problemas para abrirlo,
                respóndenos a este correo y te ayudamos.
              </p>
              <hr style="border:0;border-top:1px solid #e2e8f0;margin:32px 0;" />
              <p style="font-size:14px;color:#334155;line-height:1.6;margin:0 0 12px 0;">
                <strong style="color:#0f172a;">¿Conoces Preach?</strong>
              </p>
              <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 16px 0;">
                Preach es la plataforma para pastores, predicadores, seminaristas y profesores
                que quieren estudiar con rigor y servir con fidelidad. Biblioteca personal,
                tutores especializados, idiomas bíblicos y producción ministerial —en un solo
                entorno con citas trazables.
              </p>
              <p style="margin:20px 0 0 0;">
                <a href="${SITE_URL}/register?plan=free&utm_source=lead_magnet&utm_medium=email&utm_campaign=manual_predicacion"
                   style="display:inline-block;background:transparent;color:#4338ca;border:1px solid #c7d2fe;text-decoration:none;padding:10px 22px;border-radius:8px;font-size:14px;font-weight:500;">
                  Empezar gratis sin tarjeta
                </a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 36px;background:#f8fafc;border-top:1px solid #e2e8f0;">
              <p style="font-size:12px;color:#94a3b8;line-height:1.6;margin:0;">
                Te enviamos este correo porque solicitaste el manual desde dosfilosapp.web.app.
                Si no fuiste tú, puedes ignorar este mensaje.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
