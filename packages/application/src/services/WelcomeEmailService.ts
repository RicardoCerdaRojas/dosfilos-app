import { getFunctions, httpsCallable } from 'firebase/functions';

interface PreviewWelcomeEmailInput {
    flow: 'free' | 'paid';
    locale: 'es' | 'en';
    name: string;
}

interface PreviewWelcomeEmailResult {
    flow: 'free' | 'paid';
    locale: 'es' | 'en';
    subject: string;
    html: string;
}

export class WelcomeEmailService {
    /**
     * Renders the onboarding welcome email with sample inputs and
     * returns the compiled subject + HTML. Used by the super-admin
     * preview page so we can validate copy + design without sending
     * real emails. Server-side gate on `previewWelcomeEmail` enforces
     * the super-admin check.
     */
    async previewWelcomeEmail(input: PreviewWelcomeEmailInput): Promise<PreviewWelcomeEmailResult> {
        const functions = getFunctions();
        const callable = httpsCallable<PreviewWelcomeEmailInput, PreviewWelcomeEmailResult>(
            functions,
            'previewWelcomeEmail',
        );
        const result = await callable(input);
        return result.data;
    }
}

export const welcomeEmailService = new WelcomeEmailService();
