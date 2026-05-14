import { FirestoreUserIntegrationsRepository } from '@dosfilos/infrastructure';
import { WordpressIntegration } from '@dosfilos/domain';

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
}

export const userIntegrationsService = new UserIntegrationsService();
