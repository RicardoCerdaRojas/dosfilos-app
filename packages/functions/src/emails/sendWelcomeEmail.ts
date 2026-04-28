import * as functions from 'firebase-functions';
import { getAuth, UserRecord } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { resend } from './resendClient';
import {
    getWelcomeEmailTemplate,
    getWelcomeEmailSubject,
    WelcomeEmailOptions,
} from './templates/welcomeTemplate';

const SENDER_EMAIL = 'DosFilos <onboarding@dosfilos.com>';
const DASHBOARD_URL = 'https://preach.dosfilos.com/dashboard';
const LOGIN_URL = 'https://preach.dosfilos.com/login';

type Locale = 'es' | 'en';

/**
 * Reads the user's preferredLanguage from Firestore, written either by
 * `completeRegistration` (payment-first flow) or by the LanguageSwitcher in
 * the web app. Falls back to Spanish when the doc isn't ready yet — the auth
 * trigger can outrun the Firestore write by a few hundred ms.
 */
async function resolveUserLocale(uid: string): Promise<Locale> {
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

/**
 * Builds the appropriate action link for the welcome email based on the
 * account state at the moment the trigger fires:
 *   - Paid flow → user was created by `completeRegistration` with
 *     `emailVerified=true` and no password. Email gets a one-time
 *     password-reset link so the first login works without a detour.
 *   - Free flow → user was created client-side via
 *     `createUserWithEmailAndPassword` (already has password) and
 *     `emailVerified=false`. Email carries the verification link that
 *     unlocks the dashboard.
 *
 * Discriminating on `emailVerified` keeps the trigger stateless — it does
 * not need to know which Cloud Function or client SDK created the account.
 */
async function buildWelcomeOptions(user: UserRecord): Promise<WelcomeEmailOptions> {
    const email = user.email!;
    if (user.emailVerified) {
        // Paid flow: after the user sets their password we send them to /login
        // (they need to authenticate with the new password before the
        // dashboard's auth gate will let them in).
        try {
            const setPasswordUrl = await getAuth().generatePasswordResetLink(email, {
                url: LOGIN_URL,
                handleCodeInApp: false,
            });
            return { setPasswordUrl };
        } catch (err) {
            console.warn('[sendWelcomeEmail] Could not generate password reset link:', err);
            return {};
        }
    }
    // Free flow: after verification the user is already authed in their
    // browser (createUserWithEmailAndPassword logged them in client-side), so
    // /dashboard is the natural continueUrl.
    try {
        const verifyEmailUrl = await getAuth().generateEmailVerificationLink(email, {
            url: DASHBOARD_URL,
            handleCodeInApp: false,
        });
        return { verifyEmailUrl };
    } catch (err) {
        console.error('[sendWelcomeEmail] Could not generate verification link:', err);
        return {};
    }
}

/**
 * Sends the branded onboarding email to a user. Used by both the auth
 * onCreate trigger and the user-facing "resend verification" callable so
 * the copy and link logic stay in one place.
 */
export async function sendOnboardingEmail(user: UserRecord): Promise<void> {
    const email = user.email;
    if (!email) {
        console.log(`[sendOnboardingEmail] User ${user.uid} has no email, skipping.`);
        return;
    }

    const locale = await resolveUserLocale(user.uid);
    const name = user.displayName || (locale === 'en' ? 'Preacher' : 'Predicador');
    const options = await buildWelcomeOptions(user);

    const htmlContent = getWelcomeEmailTemplate(name, DASHBOARD_URL, options, locale);

    const { data, error } = await resend.emails.send({
        from: SENDER_EMAIL,
        to: email,
        subject: getWelcomeEmailSubject(locale),
        html: htmlContent,
    });

    if (error) {
        console.error('[sendOnboardingEmail] Resend error:', error);
        throw new Error(`Resend failed: ${error.message ?? 'unknown'}`);
    }

    console.log(`[sendOnboardingEmail] Sent to ${email} (${locale}). ID: ${data?.id}`);
}

export const sendWelcomeEmail = functions.auth.user().onCreate(async (user) => {
    try {
        await sendOnboardingEmail(user);
    } catch (err) {
        // Trigger errors are not retried by Firebase Auth onCreate, so we
        // swallow here and rely on the resend flow if delivery failed.
        console.error('[sendWelcomeEmail] Unexpected error:', err);
    }
});
