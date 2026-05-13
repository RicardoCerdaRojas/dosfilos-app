import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getDay1ErrorTemplate, getDay1ErrorSubject } from '../emails/templates/leadMagnetNurture/day1Error';
import { getDay3PickBookTemplate, getDay3PickBookSubject } from '../emails/templates/leadMagnetNurture/day3PickBook';
import { getDay5WorkflowTemplate, getDay5WorkflowSubject } from '../emails/templates/leadMagnetNurture/day5Workflow';
import { getDay7TrialTemplate, getDay7TrialSubject } from '../emails/templates/leadMagnetNurture/day7Trial';
import type { Locale } from '../emails/templates/leadMagnetNurture/shell';

type Stage = 'day1' | 'day3' | 'day5' | 'day7';

const TEMPLATES: Record<Stage, {
    template: (name: string, locale: Locale) => string;
    subject: (locale: Locale) => string;
}> = {
    day1: { template: getDay1ErrorTemplate, subject: getDay1ErrorSubject },
    day3: { template: getDay3PickBookTemplate, subject: getDay3PickBookSubject },
    day5: { template: getDay5WorkflowTemplate, subject: getDay5WorkflowSubject },
    day7: { template: getDay7TrialTemplate, subject: getDay7TrialSubject },
};

interface PreviewRequest {
    stage: Stage;
    locale?: Locale;
    name?: string;
}

const SUPER_ADMIN_EMAIL = 'rdocerda@gmail.com';

/**
 * Renders a nurture template with sample inputs and returns the
 * compiled HTML + subject. Used by the super-admin preview page so
 * we can review every email design + copy without having to send
 * real emails or wait for the daily scheduler.
 *
 * Auth: super-admin only (matches the email used by AdminLeadMagnets
 * and the Firestore rules that gate `lead_magnet_submissions/`).
 */
export const previewLeadMagnetNurture = onCall<PreviewRequest>(
    { region: 'us-central1' },
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
        return {
            stage,
            locale: resolvedLocale,
            subject: entry.subject(resolvedLocale),
            html: entry.template(resolvedName, resolvedLocale),
        };
    },
);
