/**
 * Shared HTML shell for the lead-magnet nurture sequence. Audience is
 * pre-signup pastors who downloaded the manual but haven't created a
 * trial account yet — tone is warm-pastoral, not product-pitchy, and
 * every email earns the next open by giving real value (a teaching
 * point, a usage idea) before its soft CTA at the bottom.
 *
 * Keep the shell visually consistent with the existing post-signup
 * `nurture/` templates so a lead who converts doesn't get whiplash.
 */
export type Locale = 'es' | 'en';

interface ShellOptions {
    title: string;
    greeting: string;
    bodyHtml: string;
    ctaLabel: string;
    ctaHref: string;
    closing: string;
    unsubscribeLabel: string;
    unsubscribeHref: string;
}

/**
 * Public URL of the official Preach wordmark. Hosted from the web
 * package's `public/` folder — survives email clients that strip
 * SVG, since it's a PNG. The image already includes the orange P
 * mark + tagline ("THE WORD. UNDERSTOOD. PROCLAIMED."), so the
 * shell doesn't need a separate text wordmark or tagline.
 */
const LOGO_URL = 'https://preach.dosfilos.com/logo_dfp.png';

/**
 * Brand palette tuned to harmonize with the official Preach logo
 * (warm amber P + dark wordmark). The app's primary token is
 * indigo, but the email surface follows the logo's palette so the
 * masthead and the CTA read as one piece — an indigo button under
 * an amber logo looked discordant in practice (user feedback,
 * 2026-05-13).
 *
 * Tailwind references: amber-600 / amber-100.
 */
const BRAND_PRIMARY = '#D97706';
const BRAND_PRIMARY_TINT = '#fef3c7';
const TEXT_PRIMARY = '#1f2937';
const TEXT_SECONDARY = '#4b5563';
const TEXT_MUTED = '#9ca3af';
const BG_SUBTLE = '#f9fafb';
const BORDER = '#e5e7eb';

export function renderNurtureShell(opts: ShellOptions): string {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${opts.title}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: ${TEXT_PRIMARY}; background: ${BG_SUBTLE}; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 32px 24px; background: white; }
        .header { text-align: center; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid ${BORDER}; }
        .logo { height: 56px; width: auto; display: inline-block; }
        .greeting { font-size: 17px; font-weight: 600; margin: 0 0 16px 0; color: ${TEXT_PRIMARY}; }
        .button { display: inline-block; padding: 14px 28px; background: ${BRAND_PRIMARY}; color: white !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; }
        .quote { font-style: italic; border-left: 3px solid ${BRAND_PRIMARY}; padding: 12px 16px; color: ${TEXT_SECONDARY}; margin: 20px 0; background: ${BRAND_PRIMARY_TINT}; border-radius: 0 6px 6px 0; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid ${BORDER}; font-size: 12px; color: ${TEXT_MUTED}; text-align: center; }
        .footer a { color: ${TEXT_SECONDARY}; }
        h3 { color: ${TEXT_PRIMARY}; font-size: 16px; margin: 24px 0 8px 0; }
        ul { padding-left: 20px; }
        li { margin: 8px 0; }
        p { margin: 12px 0; color: ${TEXT_PRIMARY}; }
        a { color: ${BRAND_PRIMARY}; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <a href="https://preach.dosfilos.com" target="_blank" rel="noopener">
                <img src="${LOGO_URL}" alt="Preach — by DosFilos" class="logo" />
            </a>
        </div>

        <p class="greeting">${opts.greeting}</p>

        ${opts.bodyHtml}

        <div style="text-align: center; margin: 32px 0;">
            <a href="${opts.ctaHref}" class="button">${opts.ctaLabel}</a>
        </div>

        <p style="color: ${TEXT_SECONDARY};">${opts.closing}</p>

        <div class="footer">
            <p>© ${new Date().getFullYear()} DosFilos — Preach</p>
            <p><a href="${opts.unsubscribeHref}">${opts.unsubscribeLabel}</a></p>
        </div>
    </div>
</body>
</html>`;
}

export const TRIAL_URL = 'https://preach.dosfilos.com/register';
export const UNSUBSCRIBE_URL = 'https://preach.dosfilos.com/unsubscribe';

export function fallbackName(locale: Locale): string {
    return locale === 'en' ? 'preacher' : 'predicador';
}

export function unsubscribeLabel(locale: Locale): string {
    return locale === 'en' ? 'Unsubscribe' : 'Darse de baja';
}
