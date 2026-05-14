/**
 * HTML shell for an extraction emailed BY a pastor TO their audience.
 *
 * Different surface from the lead-magnet nurture shell:
 *   - Sender is the pastor (their name in From, their note up top),
 *     NOT the platform. The recipients know the pastor, not Preach.
 *   - Branding is subtle attribution at the bottom — we don't want
 *     to push DosFilos on a congregant who never opted into our
 *     marketing.
 *   - Body is the artifact's markdown rendered as HTML, scoped with
 *     reading-friendly typography.
 */
const LOGO_URL = 'https://preach.dosfilos.com/logo_dfp.png';
const ACCENT = '#D97706';
const TEXT_PRIMARY = '#1f2937';
const TEXT_SECONDARY = '#4b5563';
const TEXT_MUTED = '#9ca3af';
const BG = '#f9fafb';
const BORDER = '#e5e7eb';

interface ShareShellOptions {
    title: string;
    senderName: string;
    senderNoteHtml: string | null;
    bodyHtml: string;
    unsubscribeHref: string;
}

export function renderShareShell(opts: ShareShellOptions): string {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${escapeHtml(opts.title)}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.65; color: ${TEXT_PRIMARY}; background: ${BG}; margin: 0; padding: 0; }
        .container { max-width: 640px; margin: 0 auto; padding: 32px 24px; background: white; }
        .sender-note { background: ${BG}; border-left: 3px solid ${ACCENT}; padding: 14px 18px; border-radius: 0 6px 6px 0; margin-bottom: 28px; color: ${TEXT_SECONDARY}; font-size: 14px; }
        .sender-note .from { display: block; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: ${TEXT_MUTED}; margin-bottom: 4px; }
        .body { font-size: 16px; }
        .body h1, .body h2 { color: ${TEXT_PRIMARY}; margin-top: 28px; margin-bottom: 12px; line-height: 1.25; }
        .body h1 { font-size: 26px; }
        .body h2 { font-size: 21px; }
        .body h3 { font-size: 17px; margin-top: 20px; margin-bottom: 8px; color: ${TEXT_PRIMARY}; }
        .body blockquote { border-left: 3px solid ${ACCENT}; padding: 8px 16px; color: ${TEXT_SECONDARY}; margin: 18px 0; background: #fef3c7; border-radius: 0 6px 6px 0; font-style: italic; }
        .body p { margin: 14px 0; color: ${TEXT_PRIMARY}; }
        .body a { color: ${ACCENT}; }
        .body ul, .body ol { padding-left: 22px; margin: 12px 0; }
        .body li { margin: 6px 0; }
        .body strong { color: ${TEXT_PRIMARY}; }
        .footer { margin-top: 48px; padding-top: 20px; border-top: 1px solid ${BORDER}; font-size: 11px; color: ${TEXT_MUTED}; text-align: center; }
        .footer img { height: 22px; width: auto; opacity: 0.7; vertical-align: middle; margin-right: 6px; }
        .footer a { color: ${TEXT_MUTED}; text-decoration: underline; }
    </style>
</head>
<body>
    <div class="container">
        ${opts.senderNoteHtml
            ? `<div class="sender-note"><span class="from">De ${escapeHtml(opts.senderName)}</span>${opts.senderNoteHtml}</div>`
            : `<div class="sender-note"><span class="from">De ${escapeHtml(opts.senderName)}</span>Te comparto este recurso.</div>`}

        <div class="body">${opts.bodyHtml}</div>

        <div class="footer">
            <p>
                <a href="https://preach.dosfilos.com" target="_blank" rel="noopener">
                    <img src="${LOGO_URL}" alt="Preach" /> Compartido vía Preach
                </a>
            </p>
            <p><a href="${opts.unsubscribeHref}">Si prefieres no recibir más correos de este remitente, responde con "baja"</a></p>
        </div>
    </div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
