import { IBibleVersionRepository } from '@/domain/bible/ports/IBibleVersionRepository';
import { RVR1960Repository } from './RVR1960Repository';
import { ASVRepository } from './ASVRepository';
import { GreekOriginalRepository } from './GreekOriginalRepository';
import { HebrewOriginalRepository } from './HebrewOriginalRepository';

/**
 * Registry of available Bible versions. Order matters — the first
 * entry is used as a fallback when an unknown version id is requested
 * (and as the default for `getForLocale` when the locale doesn't
 * match any registered version).
 *
 * Translations (RVR/ASV) ship as bundled JSON, sync access. Original
 * languages (SBLGNT Greek, MORPHHB Hebrew) lazy-load chapter text
 * from a CDN via async `loadChapter` — the BibleReader switches code
 * paths when it sees `language === 'greek' | 'hebrew'`.
 */
const VERSIONS = [
    { id: 'RVR1960', name: 'Reina Valera 1960', language: 'es', repoClass: RVR1960Repository },
    { id: 'ASV', name: 'American Standard Version', language: 'en', repoClass: ASVRepository },
    { id: 'SBLGNT', name: 'Griego (NT, SBLGNT)', language: 'greek', repoClass: GreekOriginalRepository },
    { id: 'MORPHHB', name: 'Hebreo (AT, WLC)', language: 'hebrew', repoClass: HebrewOriginalRepository },
];

/**
 * Factory for creating Bible version repositories
 */
export class BibleVersionFactory {
    private static repositories = new Map<string, IBibleVersionRepository>();

    static getForLocale(locale: string): IBibleVersionRepository {
        const language = locale.startsWith('en') ? 'en' : 'es';
        const version = VERSIONS.find(v => v.language === language) ?? VERSIONS[0];
        return this.getByVersion(version.id);
    }

    static getByVersion(versionId: string): IBibleVersionRepository {
        if (!this.repositories.has(versionId)) {
            const versionConfig = VERSIONS.find(v => v.id === versionId) ?? VERSIONS[0];
            const repo = new versionConfig.repoClass();
            this.repositories.set(versionId, repo);
        }

        return this.repositories.get(versionId)!;
    }

    static getAllVersions(): { id: string; name: string; language: string }[] {
        return VERSIONS.map(({ id, name, language }) => ({ id, name, language }));
    }
}
