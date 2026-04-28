import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { resend } from '../emails/resendClient';

const ADMIN_EMAIL = 'rdocerda@gmail.com';
const SENDER_EMAIL = 'DosFilos <onboarding@dosfilos.com>';
const ALERT_THRESHOLD = 0.9;

/**
 * Hito 6.1 — emails the admin once per reset cycle when an active LlamaParse
 * account crosses 90% of its monthly credit limit. Runs daily at 06:30 UTC, 30
 * minutes after `resetLlamaParseCounters` so a freshly reset account is never
 * flagged with stale data.
 *
 * Idempotency: each alert writes `lastAlert90At` on the account doc.
 * `resetLlamaParseCounters` deletes that field at the start of every new
 * billing cycle, so we re-alert exactly once per cycle that crosses 90%.
 */
export const alertLlamaParseUsage = onSchedule(
    {
        schedule: 'every day 06:30',
        timeZone: 'UTC',
        region: 'us-central1',
        memory: '256MiB',
    },
    async () => {
        const db = getFirestore();
        const snap = await db.collection('llamaparseAccounts').get();
        const triggered: Array<{ id: string; name: string; pct: number; used: number; limit: number }> = [];

        for (const doc of snap.docs) {
            const data = doc.data();
            if (data.active === false) continue;
            const used = Number(data.creditsUsed) || 0;
            const limit = Number(data.creditsLimit) || 0;
            if (limit <= 0) continue;
            const pct = used / limit;
            if (pct < ALERT_THRESHOLD) continue;

            if (data.lastAlert90At) continue;

            triggered.push({
                id: doc.id,
                name: data.name ?? doc.id,
                pct: Math.round(pct * 100),
                used,
                limit,
            });
        }

        if (triggered.length === 0) {
            console.log('[AlertLlamaParse] No accounts above 90%, nothing to send.');
            return;
        }

        try {
            const html = renderAlertEmail(triggered);
            const { data, error } = await resend.emails.send({
                from: SENDER_EMAIL,
                to: ADMIN_EMAIL,
                subject: `[DosFilos] LlamaParse: ${triggered.length} cuenta(s) ≥90% de uso`,
                html,
            });
            if (error) {
                console.error('[AlertLlamaParse] Resend error', error);
                return;
            }
            console.log(`[AlertLlamaParse] Sent. id=${data?.id} accounts=${triggered.length}`);
        } catch (err) {
            console.error('[AlertLlamaParse] Send failed', err);
            return;
        }

        for (const account of triggered) {
            await db.collection('llamaparseAccounts').doc(account.id).update({
                lastAlert90At: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            });
        }
    },
);

function renderAlertEmail(
    accounts: Array<{ id: string; name: string; pct: number; used: number; limit: number }>,
): string {
    const rows = accounts.map(a => `
        <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;font-family:monospace;">${escapeHtml(a.name)}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">
                <strong>${a.pct}%</strong>
            </td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">
                ${a.used.toLocaleString()} / ${a.limit.toLocaleString()}
            </td>
        </tr>
    `).join('');

    return `<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,system-ui,sans-serif;color:#222;max-width:640px;margin:24px auto;">
    <h2 style="margin:0 0 8px 0;">LlamaParse — Alerta de uso ≥90%</h2>
    <p style="color:#555;margin:0 0 16px 0;">
        ${accounts.length} cuenta(s) activa(s) llegaron al 90% del límite mensual.
        Activa la siguiente cuenta en la rotación o aumenta el límite antes de que se agoten los créditos.
    </p>
    <table style="width:100%;border-collapse:collapse;border-top:1px solid #eee;">
        <thead>
            <tr style="background:#fafafa;text-align:left;">
                <th style="padding:8px 12px;border-bottom:1px solid #eee;">Cuenta</th>
                <th style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">Uso</th>
                <th style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">Créditos</th>
            </tr>
        </thead>
        <tbody>${rows}</tbody>
    </table>
    <p style="margin:24px 0 0 0;">
        <a href="https://preach.dosfilos.com/dashboard/admin/llamaparse-monitoring"
           style="display:inline-block;padding:10px 16px;background:#111;color:#fff;text-decoration:none;border-radius:6px;">
            Abrir panel de monitoring
        </a>
    </p>
</body>
</html>`;
}

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
