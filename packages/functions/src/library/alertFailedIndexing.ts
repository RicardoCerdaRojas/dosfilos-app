import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { resend } from '../emails/resendClient';
import { APP_URL } from '../config/urls';

const ADMIN_EMAIL = 'rdocerda@gmail.com';
const SENDER_EMAIL = 'DosFilos <onboarding@dosfilos.com>';

interface FailedResource {
    id: string;
    title: string;
    userId: string;
    pageCount: number;
    error: string;
}

/**
 * Alerts the admin when a library resource is sitting at
 * `indexingStatus: 'failed'` — extraction succeeded, indexing did not,
 * so the book is silently absent from every RAG retrieval.
 *
 * This state used to be invisible from the outside. A 425-page premium
 * commentary failed to index on 2026-08-29 (a sparse `sectionPath` the
 * chunker produced when the markdown skipped a heading level) and the
 * only trace was one Cloud Logging line and a tooltip on one card. The
 * user found out by noticing their study was blocked. The trigger runs
 * with `RETRY_POLICY_DO_NOT_RETRY`, so nothing retries on its own
 * either — a failure here is permanent until somebody looks.
 *
 * Runs daily at 07:00 UTC, after the LlamaParse usage alert.
 *
 * Idempotency: each alert stamps `indexFailureAlertedAt` on the
 * resource. `indexResourceChunks` clears it on a successful index, so a
 * resource that fails again after a successful retry alerts again — but
 * one that stays broken does not nag every morning.
 */
export const alertFailedIndexing = onSchedule(
    {
        schedule: 'every day 07:00',
        secrets: ['RESEND_API_KEY'],
        timeZone: 'UTC',
        region: 'us-central1',
        memory: '256MiB',
    },
    async () => {
        const db = getFirestore();
        const snap = await db
            .collection('library_resources')
            .where('indexingStatus', '==', 'failed')
            .get();

        const unalerted: FailedResource[] = [];
        for (const doc of snap.docs) {
            const data = doc.data();
            if (data.indexFailureAlertedAt) continue;
            unalerted.push({
                id: doc.id,
                title: data.title ?? doc.id,
                userId: data.userId ?? 'unknown',
                pageCount: Number(data.pageCount) || 0,
                error: data.indexingError ?? 'sin detalle',
            });
        }

        if (unalerted.length === 0) {
            console.log(
                `[AlertFailedIndexing] ${snap.size} resource(s) failed, all already alerted. Nothing to send.`,
            );
            return;
        }

        try {
            const { data, error } = await resend.emails.send({
                from: SENDER_EMAIL,
                to: ADMIN_EMAIL,
                subject: `[DosFilos] Indexación fallida: ${unalerted.length} recurso(s) fuera del RAG`,
                html: renderAlertEmail(unalerted),
            });
            if (error) {
                console.error('[AlertFailedIndexing] Resend error', error);
                return;
            }
            console.log(`[AlertFailedIndexing] Sent. id=${data?.id} resources=${unalerted.length}`);
        } catch (err) {
            console.error('[AlertFailedIndexing] Send failed', err);
            return;
        }

        // Stamp only after the email actually went out, so a send failure
        // re-alerts tomorrow instead of silently swallowing the incident.
        for (const r of unalerted) {
            await db.collection('library_resources').doc(r.id).update({
                indexFailureAlertedAt: FieldValue.serverTimestamp(),
            });
        }
    },
);

function renderAlertEmail(resources: FailedResource[]): string {
    const rows = resources.map(r => `
        <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;">
                ${escapeHtml(r.title)}
                <div style="font-family:monospace;font-size:11px;color:#888;">${escapeHtml(r.id)}</div>
            </td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">
                ${r.pageCount || '—'}
            </td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:12px;color:#a33;">
                ${escapeHtml(r.error.slice(0, 240))}
            </td>
        </tr>
    `).join('');

    return `<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,system-ui,sans-serif;color:#222;max-width:720px;margin:24px auto;">
    <h2 style="margin:0 0 8px 0;">Indexación fallida — recursos fuera del RAG</h2>
    <p style="color:#555;margin:0 0 16px 0;">
        ${resources.length} recurso(s) extrajeron texto correctamente pero fallaron al indexar.
        No aparecen en ninguna búsqueda ni cita hasta que se reindexen.
        Reindexar no vuelve a cobrar páginas: reusa el <code>structured.md</code> ya guardado.
    </p>
    <table style="width:100%;border-collapse:collapse;border-top:1px solid #eee;">
        <thead>
            <tr style="background:#fafafa;text-align:left;">
                <th style="padding:8px 12px;border-bottom:1px solid #eee;">Recurso</th>
                <th style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">Págs.</th>
                <th style="padding:8px 12px;border-bottom:1px solid #eee;">Error</th>
            </tr>
        </thead>
        <tbody>${rows}</tbody>
    </table>
    <p style="margin:24px 0 0 0;">
        <a href="${APP_URL}/dashboard/library"
           style="display:inline-block;padding:10px 16px;background:#111;color:#fff;text-decoration:none;border-radius:6px;">
            Abrir Biblioteca
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
