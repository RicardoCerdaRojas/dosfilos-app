import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { sendDeliveryEmail } from './leadMagnetMailer';
import { appCheckCallableOptions } from '../config/appCheckOptions';

const ADMIN_EMAIL = 'rdocerda@gmail.com';

interface ResendLeadMagnetRequest {
    /** Firestore doc id (e.g. `manual-para-predicadores__alguien_example.com`). */
    leadId: string;
}

interface ResendLeadMagnetResponse {
    ok: true;
    leadId: string;
}

/**
 * Admin-only callable to re-fire the delivery email for an existing
 * lead. Used from the admin dashboard when a lead complains the email
 * didn't arrive, or when an operator wants to bump a stale lead with
 * a fresh signed URL.
 *
 * Authorization: caller must be authenticated AND match the hardcoded
 * admin email. Same gate the existing `extendUserTrialAdmin` and
 * other admin callables use — consistent with the rest of the
 * admin surface.
 *
 * Effect: reads the lead doc, generates a NEW signed URL (the
 * mailer regenerates per send), dispatches via Resend, increments
 * `requestCount` and stamps `lastEmailedAt`. The original `createdAt`
 * is preserved — operators can still see when the lead first arrived.
 */
export const resendLeadMagnet = onCall<ResendLeadMagnetRequest, Promise<ResendLeadMagnetResponse>>(
    { ...appCheckCallableOptions(), region: 'us-central1' },
    async (request) => {
        // Auth gate — both must be present.
        if (!request.auth || request.auth.token?.email !== ADMIN_EMAIL) {
            throw new HttpsError('permission-denied', 'Admin only');
        }

        const { leadId } = request.data;
        if (!leadId || typeof leadId !== 'string') {
            throw new HttpsError('invalid-argument', 'leadId is required');
        }

        const db = getFirestore();
        const leadRef = db.collection('lead_magnet_submissions').doc(leadId);
        const snap = await leadRef.get();
        if (!snap.exists) {
            throw new HttpsError('not-found', `Lead ${leadId} not found`);
        }

        const data = snap.data() ?? {};
        const email = (data.email as string | undefined)?.trim();
        const name = (data.name as string | null | undefined) ?? '';
        if (!email) {
            throw new HttpsError('failed-precondition', `Lead ${leadId} has no email on record`);
        }

        try {
            await sendDeliveryEmail({ to: email, name });
            await leadRef.update({
                emailDelivered: true,
                lastEmailedAt: FieldValue.serverTimestamp(),
                lastRequestedAt: FieldValue.serverTimestamp(),
                requestCount: FieldValue.increment(1),
                lastEmailError: FieldValue.delete(),
            });
        } catch (err: any) {
            console.error('[resendLeadMagnet] Resend dispatch failed:', err?.message ?? err);
            await leadRef.update({
                emailDelivered: false,
                lastEmailError: err?.message ?? 'unknown',
            });
            throw new HttpsError('internal', `Could not resend: ${err?.message ?? 'unknown error'}`);
        }

        return { ok: true, leadId };
    },
);
