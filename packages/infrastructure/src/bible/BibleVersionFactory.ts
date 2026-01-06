import { IBibleVersionRepository } from '@dosfilos/domain';
import { RVR1960Repository } from './repositories/RVR1960Repository';
import { ASVRepository } from './repositories/ASVRepository';

/**
 * Factory for creating Bible version repositories
 * 
 * Follows Factory Pattern + Open/Closed Principle:
 * - Open for extension: Add new versions without modifying this class
 * - Closed for modification: Core logic remains stable
 * 
 * Implements Singleton pattern for repository instances (performance optimization)
 */
export class BibleVersionFactory {
    private static repositories = new Map<string, IBibleVersionRepository>();

    /**
     * Get repository for a specific locale/language
     * @param locale - i18n locale code (e.g., "es", "en", "es-ES", "en-US")
     * @returns Appropriate Bible version repository
     */
    static getForLocale(locale: string): IBibleVersionRepository {
        const language = locale.startsWith('en') ? 'en' : 'es';

        if (!this.repositories.has(language)) {
            const repo = language === 'en'
                ? new ASVRepository()      // English → ASV
                : new RVR1960Repository(); // Spanish → RVR1960
            this.repositories.set(language, repo);
        }

        return this.repositories.get(language)!;
    }

    /**
     * Get repository by version ID
     * @param versionId - Bible version identifier ("RVR1960", "ASV", etc.)
     * @returns Specific Bible version repository
     */
    static getByVersion(versionId: 'RVR1960' | 'ASV'): IBibleVersionRepository {
        if (!this.repositories.has(versionId)) {
            const repo = versionId === 'ASV'
                ? new ASVRepository()
                : new RVR1960Repository();
            this.repositories.set(versionId, repo);
        }

        return this.repositories.get(versionId)!;
    }

    /**
     * Clear cached repositories (useful for testing)
     */
    static clearCache(): void {
        this.repositories.clear();
    }
}
