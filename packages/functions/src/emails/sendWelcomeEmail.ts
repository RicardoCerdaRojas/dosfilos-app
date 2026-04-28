import * as functions from 'firebase-functions';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { resend } from './resendClient';
import { getWelcomeEmailTemplate, getWelcomeEmailSubject } from './templates/welcomeTemplate';

const SENDER_EMAIL = 'DosFilos <onboarding@dosfilos.com>';
const DASHBOARD_URL = 'https://preach.dosfilos.com/dashboard';

/**
 * Reads the user's preferredLanguage from Firestore, written either by
 * `completeRegistration` (payment-first flow) or by the LanguageSwitcher in
 * the web app. Falls back to Spanish when the doc isn't ready yet — the auth
 * trigger can outrun the Firestore write by a few hundred ms.
 */
async function resolveUserLocale(uid: string): Promise<'es' | 'en'> {
    try {
        const snap = await getFirestore().collection('users').doc(uid).get();
        const data = snap.data();
        const lang = data?.preferredLanguage ?? data?.locale;
        return lang === 'en' ? 'en' : 'es';
    } catch (err) {
        console.warn('[sendWelcomeEmail] Failed to read preferredLanguage, defaulting to es:', err);
        return 'es';
    }
}

export const sendWelcomeEmail = functions.auth.user().onCreate(async (user) => {
    const email = user.email;
    const locale = await resolveUserLocale(user.uid);
    const name = user.displayName || (locale === 'en' ? 'Preacher' : 'Predicador');

    if (!email) {
        console.log('User has no email, skipping welcome email.');
        return;
    }

    // Users registered via the payment-first flow have no password yet — generate a
    // one-time "set password" link so their first login works without a separate
    // "forgot password" detour. Firebase links inherit the project's action URL.
    let setPasswordLink: string | undefined;
    try {
        setPasswordLink = await getAuth().generatePasswordResetLink(email);
    } catch (err) {
        console.warn('Could not generate password reset link (non-critical)', err);
    }

    try {
        const htmlContent = getWelcomeEmailTemplate(name, DASHBOARD_URL, setPasswordLink, locale);

        const { data, error } = await resend.emails.send({
            from: SENDER_EMAIL,
            to: email,
            subject: getWelcomeEmailSubject(locale),
            html: htmlContent,
        });

        if (error) {
            console.error('Error sending welcome email via Resend:', error);
            return;
        }

        console.log(`Welcome email sent to ${email} (${locale}). ID: ${data?.id}`);
    } catch (err) {
        console.error('Unexpected error sending welcome email:', err);
    }
});
