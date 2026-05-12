import { getStorage } from 'firebase-admin/storage';
import { Resend } from 'resend';

/**
 * Shared mailer for the lead-magnet flow. Both `captureLead` (visitor
 * submits form) and `resendLeadMagnet` (admin re-fires email from the
 * admin panel) share the same signed-URL generation + email rendering
 * + Resend dispatch logic so the two paths can never drift.
 */

const FROM_ADDRESS = 'Preach <hola@dosfilos.com>';
const STORAGE_BUCKET = 'dosfilosapp.firebasestorage.app';
const LEAD_MAGNET_STORAGE_PATH = 'public-assets/manual-para-predicadores.pdf';
const SIGNED_URL_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;
const SITE_URL = 'https://dosfilosapp.web.app';

/**
 * Generates a fresh signed URL pointing at the lead-magnet PDF in
 * Cloud Storage. Expires in 30 days. We never reuse URLs — every
 * delivery (initial or resend) gets a fresh signature so we don't
 * have to track "URL still valid" state per lead.
 */
export async function generateSignedDownloadUrl(): Promise<string> {
    const bucket = getStorage().bucket(STORAGE_BUCKET);
    const file = bucket.file(LEAD_MAGNET_STORAGE_PATH);
    const [url] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + SIGNED_URL_EXPIRY_MS,
    });
    return url;
}

/**
 * Sends the lead-magnet delivery email through Resend. Throws on
 * dispatch failure so callers can surface the error to the operator
 * (admin resend) or the visitor (initial capture). The Resend client
 * is instantiated per-call so a missing API key fails loudly at
 * send time rather than at module load.
 */
export async function sendDeliveryEmail({
    to,
    name,
}: {
    to: string;
    name: string;
}): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        throw new Error('RESEND_API_KEY environment variable is required');
    }

    const downloadUrl = await generateSignedDownloadUrl();
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

/**
 * HTML body for the delivery email. Mirrors the landing's dark
 * editorial palette so the brand stays consistent ad → landing →
 * email → product. Standalone template (not a Resend template id)
 * because the content is short and one-magnet today; if we add
 * more magnets later, this gets parameterized or moved to a
 * proper template manager.
 */
function renderEmailHtml({ greeting, downloadUrl }: { greeting: string; downloadUrl: string }): string {
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
