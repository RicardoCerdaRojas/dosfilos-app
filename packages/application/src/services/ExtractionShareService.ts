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
}

export const extractionShareService = new ExtractionShareService();
