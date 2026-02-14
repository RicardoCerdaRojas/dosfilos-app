import { IBibleVersionRepository } from '@/domain/bible/ports/IBibleVersionRepository';
import { RVR1960Repository } from './RVR1960Repository';
import { ASVRepository } from './ASVRepository';

/**
 * Registry of available Bible versions
 */
const VERSIONS = [
    { id: 'RVR1960', name: 'Reina Valera 1960', language: 'es', repoClass: RVR1960Repository },
    { id: 'ASV', name: 'American Standard Version', language: 'en', repoClass: ASVRepository }
];

/**
 * Factory for creating Bible version repositories
 */
export class BibleVersionFactory {
    private static repositories = new Map<string, IBibleVersionRepository>();

    static getForLocale(locale: string): IBibleVersionRepository {
        const language = locale.startsWith('en') ? 'en' : 'es';
        const version = VERSIONS.find(v => v.language === language) || VERSIONS[0];
        return this.getByVersion(version.id);
    }

    static getByVersion(versionId: string): IBibleVersionRepository {
        if (!this.repositories.has(versionId)) {
            const versionConfig = VERSIONS.find(v => v.id === versionId) || VERSIONS[0];
            const repo = new versionConfig.repoClass();
            this.repositories.set(versionId, repo);
        }

        return this.repositories.get(versionId)!;
    }

    static getAllVersions(): { id: string; name: string; language: string }[] {
        return VERSIONS.map(({ id, name, language }) => ({ id, name, language }));
    }
}
