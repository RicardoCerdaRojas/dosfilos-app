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

export function renderNurtureShell(opts: ShellOptions): string {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${opts.title}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1f2937; background: #f9fafb; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 32px 24px; background: white; }
        .header { text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #e5e7eb; }
        .brand { font-size: 22px; font-weight: 700; color: #4f46e5; margin: 0; letter-spacing: -0.5px; }
        .tagline { font-size: 12px; color: #6b7280; margin-top: 4px; letter-spacing: 0.5px; text-transform: uppercase; }
        .greeting { font-size: 17px; font-weight: 600; margin: 0 0 16px 0; }
        .button { display: inline-block; padding: 14px 28px; background: #4f46e5; color: white !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; }
        .quote { font-style: italic; border-left: 3px solid #4f46e5; padding: 8px 16px; color: #4b5563; margin: 20px 0; background: #f3f4f6; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; text-align: center; }
        .footer a { color: #6b7280; }
        h3 { color: #1f2937; font-size: 16px; margin: 24px 0 8px 0; }
        ul { padding-left: 20px; }
        li { margin: 8px 0; }
        p { margin: 12px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="brand">Preach</div>
            <div class="tagline">por DosFilos</div>
        </div>

        <p class="greeting">${opts.greeting}</p>

        ${opts.bodyHtml}

        <div style="text-align: center; margin: 32px 0;">
            <a href="${opts.ctaHref}" class="button">${opts.ctaLabel}</a>
        </div>

        <p style="color: #4b5563;">${opts.closing}</p>

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
