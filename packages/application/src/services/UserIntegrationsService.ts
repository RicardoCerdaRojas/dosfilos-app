import { FirestoreUserIntegrationsRepository } from '@dosfilos/infrastructure';
import { WordpressIntegration } from '@dosfilos/domain';
import { getFunctions, httpsCallable } from 'firebase/functions';

interface WordpressConnectionTestResult {
    ok: boolean;
    status: number;
    code?: string | null;
    message?: string | null;
    resolvedUser?: {
        id: number | null;
        name: string | null;
        slug: string | null;
        roles: string[];
        canEditPosts: boolean;
    };
    warning?: string | null;
    raw?: string;
}

/**
 * Web-side service for managing per-user 3rd-party integration
 * credentials. Wraps the Firestore repo so UI components don't import
 * Firebase directly (compliance gate C7.3).
 */
class UserIntegrationsService {
    private repo = new FirestoreUserIntegrationsRepository();

    getWordpress(userId: string): Promise<WordpressIntegration | null> {
        return this.repo.getWordpress(userId);
    }

    saveWordpress(
        userId: string,
        config: { siteUrl: string; username: string; appPassword: string; defaultStatus: 'draft' | 'publish' },
    ): Promise<void> {
        if (!/^https?:\/\//.test(config.siteUrl.trim())) {
            throw new Error('siteUrl must start with http:// or https://');
        }
        if (!config.username.trim()) throw new Error('username required');
        if (!config.appPassword.trim()) throw new Error('appPassword required');
        return this.repo.saveWordpress(userId, config);
    }

    deleteWordpress(userId: string): Promise<void> {
        return this.repo.deleteWordpress(userId);
    }

    /**
     * Probes the WP integration. Returns the resolved user + caps so
     * the UI can tell the operator whether auth + permission are OK
     * before they try to publish a real post.
     */
    async testWordpressConnection(): Promise<WordpressConnectionTestResult> {
        const functions = getFunctions();
        const callable = httpsCallable<unknown, WordpressConnectionTestResult>(
            functions,
            'testWordpressConnection',
        );
        const result = await callable({});
        return result.data;
    }
}

export const userIntegrationsService = new UserIntegrationsService();
