import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { render } from '@react-email/render';
import { WelcomeEmail, getWelcomeEmailSubject } from '../emails/templates/WelcomeEmail';
import { appCheckCallableOptions } from '../config/appCheckOptions';

type Flow = 'free' | 'paid';
type Locale = 'es' | 'en';

interface PreviewRequest {
    flow?: Flow;
    locale?: Locale;
    name?: string;
}

const SUPER_ADMIN_EMAIL = 'rdocerda@gmail.com';

const SAMPLE_DASHBOARD_URL = 'https://preach.dosfilos.com/dashboard';
const SAMPLE_VERIFY_URL = 'https://preach.dosfilos.com/__sample__/verify';
const SAMPLE_SET_PASSWORD_URL = 'https://preach.dosfilos.com/__sample__/set-password';

/**
 * Renders the welcome email with sample inputs and returns the
 * compiled subject + HTML. Used by the super-admin preview page.
 *
 * `flow` controls which CTA block renders:
 *   - 'free' → email-verification gate (default for client-side signup)
 *   - 'paid' → set-password block (post-Stripe-checkout signup)
 *
 * Auth: super-admin only.
 */
export const previewWelcomeEmail = onCall<PreviewRequest>(
    { ...appCheckCallableOptions(), region: 'us-central1' },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Sign-in required');
        }
        if (request.auth.token.email !== SUPER_ADMIN_EMAIL) {
            throw new HttpsError('permission-denied', 'Super-admin only');
        }

        const { flow, locale, name } = request.data ?? {};
        const resolvedFlow: Flow = flow === 'paid' ? 'paid' : 'free';
        const resolvedLocale: Locale = locale === 'en' ? 'en' : 'es';
        const resolvedName =
            (typeof name === 'string' && name.trim()) ||
            (resolvedLocale === 'en' ? 'Preacher' : 'Predicador');

        const html = await render(
            WelcomeEmail({
                name: resolvedName,
                locale: resolvedLocale,
                verifyEmailUrl: resolvedFlow === 'free' ? SAMPLE_VERIFY_URL : undefined,
                setPasswordUrl: resolvedFlow === 'paid' ? SAMPLE_SET_PASSWORD_URL : undefined,
                dashboardUrl: SAMPLE_DASHBOARD_URL,
            }),
        );

        return {
            flow: resolvedFlow,
            locale: resolvedLocale,
            subject: getWelcomeEmailSubject(resolvedLocale),
            html,
        };
    },
);
