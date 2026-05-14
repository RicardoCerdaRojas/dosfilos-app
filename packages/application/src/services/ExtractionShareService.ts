import { getFunctions, httpsCallable } from 'firebase/functions';

interface SendByEmailInput {
    extractionId: string;
    recipients: string[];
    subject?: string;
    senderNote?: string;
}

interface SendByEmailResult {
    sent: number;
    failures: number;
    failedRecipients: string[];
}

interface PreviewShareInput {
    title?: string;
    senderName?: string;
    senderEmail?: string;
    senderNote?: string;
    markdown?: string;
}

interface PreviewShareResult {
    subject: string;
    html: string;
}

/**
 * Wraps the `sendExtractionByEmail` Cloud Function so UI code stays
 * out of `firebase/functions` (compliance gate C7.3). The callable
 * itself enforces ownership, rate-limits per user, and persists a
 * send log on the Extraction doc.
 *
 * Lives in its own service because the operation crosses concerns:
 * publishes content to external recipients (not just CRUD on the
 * extraction). Future publishing hooks (WordPress draft, PDF
 * download) belong here too.
 */
class ExtractionShareService {
    async sendByEmail(input: SendByEmailInput): Promise<SendByEmailResult> {
        const functions = getFunctions();
        const callable = httpsCallable<SendByEmailInput, SendByEmailResult>(
            functions,
            'sendExtractionByEmail',
        );
        const result = await callable(input);
        return result.data;
    }

    /**
     * Renders the ShareEmail template with sample inputs. Super-admin
     * only — used by the email previews page.
     */
    async previewShareEmail(input: PreviewShareInput = {}): Promise<PreviewShareResult> {
        const functions = getFunctions();
        const callable = httpsCallable<PreviewShareInput, PreviewShareResult>(
            functions,
            'previewExtractionShareEmail',
        );
        const result = await callable(input);
        return result.data;
    }

    /**
     * Publishes a persisted Extraction to the user's WordPress site
     * as a post. Requires the user to have configured their WP
     * integration first. Server-side reads credentials from
     * `users/{uid}/integrations/wordpress`, calls the WP REST API,
     * and persists the resulting `publishedRefs` log entry on the
     * Extraction doc.
     */
    async publishToWordpress(input: {
        extractionId: string;
        status?: 'draft' | 'publish';
        title?: string;
        excerpt?: string;
    }): Promise<{ postId: number; postUrl: string; status: 'draft' | 'publish' }> {
        const functions = getFunctions();
        const callable = httpsCallable<typeof input, { postId: number; postUrl: string; status: 'draft' | 'publish' }>(
            functions,
            'publishExtractionToWordpress',
        );
        const result = await callable(input);
        return result.data;
    }
}

export const extractionShareService = new ExtractionShareService();
