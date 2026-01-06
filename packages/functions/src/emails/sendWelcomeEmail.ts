import * as functions from 'firebase-functions';
import { resend } from './resendClient';
import { getWelcomeEmailTemplate } from './templates/welcomeTemplate';

// TODO: Replace with your verified domain
const SENDER_EMAIL = 'DosFilos <onboarding@dosfilos.com>';
const DASHBOARD_URL = 'https://preach.dosfilos.com/dashboard/generate-sermon';

export const sendWelcomeEmail = functions.auth.user().onCreate(async (user) => {
    const email = user.email;
    const name = user.displayName || 'Predicador';

    if (!email) {
        console.log('Use has no email, skipping welcome email.');
        return;
    }

    try {
        const htmlContent = getWelcomeEmailTemplate(name, DASHBOARD_URL);

        const { data, error } = await resend.emails.send({
            from: SENDER_EMAIL,
            to: email,
            subject: 'Bienvenido a DosFilos.Preach 🚀',
            html: htmlContent,
        });

        if (error) {
            console.error('Error sending welcome email via Resend:', error);
            return;
        }

        console.log(`Welcome email sent to ${email}. ID: ${data?.id}`);
    } catch (err) {
        console.error('Unexpected error sending welcome email:', err);
    }
});
