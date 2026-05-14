import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { render } from '@react-email/render';
import { resend } from '../emails/resendClient';
import { ShareEmail } from '../emails/templates/extractionShare/ShareEmail';

const db = admin.firestore();

interface SendExtractionByEmailRequest {
    extractionId: string;
    recipients: string[];
    subject?: string;
    senderNote?: string;
}

const MAX_RECIPIENTS_PER_SEND = 50;
const MAX_SENDS_PER_HOUR_PER_USER = 10;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Pastor-initiated email send: takes one of the user's persisted
 * Extractions and emails it as HTML to a list of recipients. Sender
 * shows as the user's display name + their authenticated email
 * (Resend Reply-To); the platform brands itself only as a small
 * footer attribution since the recipients are the pastor's audience,
 * not platform users.
 *
 * Constraints:
 *   - User must own the Extraction (verified server-side).
 *   - At most MAX_RECIPIENTS_PER_SEND addresses per call.
 *   - At most MAX_SENDS_PER_HOUR_PER_USER calls per user per hour
 *     (anti-spam guard, per-user counter in Firestore).
 *
 * Persists a `sentEmails` log entry on the Extraction doc so the UI
 * can show "Enviado a 12 personas hace 2 horas" without re-querying.
 */
export const sendExtractionByEmail = onCall<SendExtractionByEmailRequest>(
    { region: 'us-central1' },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Sign-in required');
        }

        const userId = request.auth.uid;
        const userEmail = request.auth.token.email ?? null;
        const userName = request.auth.token.name ?? userEmail ?? 'un pastor';

        const { extractionId, recipients, subject, senderNote } = request.data ?? {};

        if (!extractionId || typeof extractionId !== 'string') {
            throw new HttpsError('invalid-argument', 'extractionId required');
        }
        if (!Array.isArray(recipients) || recipients.length === 0) {
            throw new HttpsError('invalid-argument', 'recipients required');
        }

        const cleanRecipients = Array.from(new Set(
            recipients
                .map(r => (typeof r === 'string' ? r.trim().toLowerCase() : ''))
                .filter(r => EMAIL_RE.test(r)),
        ));
        if (cleanRecipients.length === 0) {
            throw new HttpsError('invalid-argument', 'No valid email addresses');
        }
        if (cleanRecipients.length > MAX_RECIPIENTS_PER_SEND) {
            throw new HttpsError('invalid-argument', `Max ${MAX_RECIPIENTS_PER_SEND} recipients per send`);
        }

        // Rate limit. Counter stored at users/{uid}/email_sends_hourly/{hourBucket}.
        const hourBucket = new Date().toISOString().slice(0, 13);
        const counterRef = db.doc(`users/${userId}/email_sends_hourly/${hourBucket}`);
        const counterSnap = await counterRef.get();
        const currentCount = (counterSnap.exists ? counterSnap.data()?.count : 0) ?? 0;
        if (currentCount >= MAX_SENDS_PER_HOUR_PER_USER) {
            throw new HttpsError('resource-exhausted', `Max ${MAX_SENDS_PER_HOUR_PER_USER} sends per hour reached`);
        }

        // Load + ownership-check the extraction.
        const extractionRef = db.doc(`extractions/${extractionId}`);
        const extractionSnap = await extractionRef.get();
        if (!extractionSnap.exists) {
            throw new HttpsError('not-found', 'Extraction not found');
        }
        const extraction = extractionSnap.data()!;
        if (extraction.userId !== userId) {
            throw new HttpsError('permission-denied', 'Not owned by user');
        }

        const finalSubject = (typeof subject === 'string' && subject.trim()) || extraction.title || 'Te comparto un recurso';
        const cleanNote = (typeof senderNote === 'string' && senderNote.trim()) ? senderNote.trim() : null;

        const html = await render(ShareEmail({
            title: finalSubject,
            senderName: userName,
            senderEmail: userEmail,
            senderNote: cleanNote,
            markdown: extraction.markdown ?? '',
        }));

        const fromName = userName.replace(/[<>"]/g, '');
        const fromAddress = `${fromName} <hola@dosfilos.com>`;

        // Send one Resend call per recipient so we don't leak the
        // distribution list in a To: header. Resend supports BCC but
        // BCC opens vary per client; per-recipient is the cleanest
        // privacy-respecting path. Iterate sequentially with a small
        // throttle so we don't hammer Resend's per-second rate limit.
        let sent = 0;
        const failures: Array<{ to: string; error: string }> = [];
        for (const to of cleanRecipients) {
            try {
                await resend.emails.send({
                    from: fromAddress,
                    replyTo: userEmail ?? undefined,
                    to,
                    subject: finalSubject,
                    html,
                });
                sent++;
            } catch (err) {
                failures.push({ to, error: err instanceof Error ? err.message : String(err) });
                console.error(`[sendExtractionByEmail] failed to ${to}:`, err);
            }
        }

        // Persist the send log on the Extraction doc.
        // Firestore disallows FieldValue.serverTimestamp() inside an
        // array element (arrayUnion). Use Timestamp.now() — client-side
        // wall clock, ~ms drift acceptable for an audit trail of email
        // sends. The doc-level updatedAt below still uses
        // serverTimestamp for the canonical lastTouched marker.
        const sendLog = {
            id: `send_${Date.now()}`,
            sentAt: Timestamp.now(),
            recipientCount: sent,
            failureCount: failures.length,
            subject: finalSubject,
        };
        await extractionRef.update({
            sentEmails: FieldValue.arrayUnion(sendLog),
            updatedAt: FieldValue.serverTimestamp(),
        });

        // Bump rate-limit counter (best-effort, atomic increment).
        await counterRef.set({
            count: FieldValue.increment(1),
            hourBucket,
            updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });

        // Hito 7 funnel event for analysis.
        const eventId = `extraction_email_${extractionId}_${Date.now()}`;
        await db.collection('funnel_events').doc(eventId).set({
            eventName: 'extraction_emailed',
            props: {
                extractionId,
                extractionType: extraction.type ?? null,
                recipientCount: sent,
                failureCount: failures.length,
            },
            userId,
            sessionId: extraction.sessionId ?? null,
            clientTimestamp: null,
            serverTimestamp: FieldValue.serverTimestamp(),
            url: null,
            referrer: null,
            userAgent: request.rawRequest?.headers['user-agent'] as string | undefined ?? null,
            ip: request.rawRequest?.headers['x-forwarded-for'] as string | undefined ?? null,
        });

        return {
            sent,
            failures: failures.length,
            failedRecipients: failures.map(f => f.to),
        };
    },
);

