import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { resend } from '../emails/resendClient';
import { getWelcomeEmailTemplate } from '../emails/templates/welcomeTemplate';

// Reuse constants
const SENDER_EMAIL = 'DosFilos <onboarding@dosfilos.com>';
const DASHBOARD_URL = 'https://preach.dosfilos.com/dashboard/generate-sermon';

export const resendWelcomeEmail = onCall(async (request) => {
    // 1. Verify Authentication
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const callerUid = request.auth.uid;
    const db = admin.firestore();

    // 2. Verify Super Admin Role
    const callerRef = db.collection('users').doc(callerUid);
    const callerDoc = await callerRef.get();

    if (!callerDoc.exists || callerDoc.data()?.role !== 'super_admin') {
        throw new HttpsError('permission-denied', 'Only super admins can resend welcome emails');
    }

    const { userId } = request.data;
    if (!userId) {
        throw new HttpsError('invalid-argument', 'Target userId is required');
    }

    try {
        console.log(`Attempting to resend welcome email to user ${userId} by admin ${callerUid}`);

        // 3. Get User Data
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            throw new HttpsError('not-found', 'User not found');
        }

        const userData = userDoc.data();
        const email = userData?.email;
        const name = userData?.displayName || 'Predicador';

        if (!email) {
            throw new HttpsError('failed-precondition', 'User has no email address');
        }

        // 4. Send Email via Resend
        const htmlContent = getWelcomeEmailTemplate(name, DASHBOARD_URL);

        const { data, error } = await resend.emails.send({
            from: SENDER_EMAIL,
            to: email,
            subject: 'Bienvenido a DosFilos.Preach 🚀',
            html: htmlContent,
        });

        if (error) {
            console.error('Error sending welcome email via Resend:', error);
            throw new HttpsError('internal', 'Failed to send email via provider');
        }

        console.log(`Welcome email resent to ${email}. ID: ${data?.id}`);
        return { success: true, message: `Email resent to ${email}`, id: data?.id };

    } catch (error: any) {
        console.error('Error resending welcome email:', error);
        // Rethrow proper HttpsError if it's not one already
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', error.message || 'Failed to resend welcome email');
    }
});
