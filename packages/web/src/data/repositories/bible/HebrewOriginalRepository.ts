import { MorphhbOriginalLanguageProvider } from '@dosfilos/infrastructure';
import type { Testament } from '@dosfilos/domain';
import { OriginalLanguageRepositoryBase } from './OriginalLanguageRepositoryBase';

/**
 * Hebrew Old Testament (Westminster Leningrad Codex via morphhb)
 * wrapper. Lazy-loads chapter text via the existing MorphHB
 * provider.
 */
export class HebrewOriginalRepository extends OriginalLanguageRepositoryBase {
    protected provider = new MorphhbOriginalLanguageProvider();
    protected testament: Testament = 'OT';
    protected versionId = 'MORPHHB';
    protected languageCode = 'hebrew';
}
