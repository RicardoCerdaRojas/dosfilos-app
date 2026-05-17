import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { render } from '@react-email/render';
import { appCheckCallableOptions } from '../config/appCheckOptions';
import { Day1ErrorEmail, getDay1ErrorSubject } from '../emails/templates/leadMagnetNurture/Day1ErrorEmail';
import { Day3PickBookEmail, getDay3PickBookSubject } from '../emails/templates/leadMagnetNurture/Day3PickBookEmail';
import { Day5WorkflowEmail, getDay5WorkflowSubject } from '../emails/templates/leadMagnetNurture/Day5WorkflowEmail';
import { Day7TrialEmail, getDay7TrialSubject } from '../emails/templates/leadMagnetNurture/Day7TrialEmail';

type Stage = 'day1' | 'day3' | 'day5' | 'day7';
type Locale = 'es' | 'en';

const TEMPLATES: Record<Stage, {
    render: (name: string, locale: Locale) => Promise<string>;
    subject: (locale: Locale) => string;
}> = {
    day1: { render: (n, l) => render(Day1ErrorEmail({ name: n, locale: l })), subject: getDay1ErrorSubject },
    day3: { render: (n, l) => render(Day3PickBookEmail({ name: n, locale: l })), subject: getDay3PickBookSubject },
    day5: { render: (n, l) => render(Day5WorkflowEmail({ name: n, locale: l })), subject: getDay5WorkflowSubject },
    day7: { render: (n, l) => render(Day7TrialEmail({ name: n, locale: l })), subject: getDay7TrialSubject },
};

interface PreviewRequest {
    stage: Stage;
    locale?: Locale;
    name?: string;
}

const SUPER_ADMIN_EMAIL = 'rdocerda@gmail.com';

/**
 * Renders a nurture template via the canonical react-email pipeline
 * and returns the compiled HTML + subject. Used by the super-admin
 * preview page so we can review every email design + copy without
 * sending real emails or waiting for the daily scheduler.
 *
 * Auth: super-admin only.
 */
export const previewLeadMagnetNurture = onCall<PreviewRequest>(
    { ...appCheckCallableOptions(), region: 'us-central1' },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Sign-in required');
        }
        if (request.auth.token.email !== SUPER_ADMIN_EMAIL) {
            throw new HttpsError('permission-denied', 'Super-admin only');
        }

        const { stage, locale, name } = request.data ?? {};
        if (!stage || !TEMPLATES[stage]) {
            throw new HttpsError('invalid-argument', `Unknown stage: ${stage}`);
        }
        const resolvedLocale: Locale = locale === 'en' ? 'en' : 'es';
        const resolvedName = (typeof name === 'string' && name.trim()) || (resolvedLocale === 'en' ? 'Preacher' : 'Predicador');

        const entry = TEMPLATES[stage];
        const html = await entry.render(resolvedName, resolvedLocale);
        return {
            stage,
            locale: resolvedLocale,
            subject: entry.subject(resolvedLocale),
            html,
        };
    },
);
