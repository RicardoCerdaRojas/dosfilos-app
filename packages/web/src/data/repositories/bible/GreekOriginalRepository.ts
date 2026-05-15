import { SBLGNTBibleProvider } from '@dosfilos/infrastructure';
import type { Testament } from '@dosfilos/domain';
import { OriginalLanguageRepositoryBase } from './OriginalLanguageRepositoryBase';

/**
 * Greek New Testament (SBLGNT) wrapper. Lazy-loads chapter text
 * from the morphgnt CDN via the existing SBLGNT provider.
 */
export class GreekOriginalRepository extends OriginalLanguageRepositoryBase {
    protected provider = new SBLGNTBibleProvider();
    protected testament: Testament = 'NT';
    protected versionId = 'SBLGNT';
    protected languageCode = 'greek';
}
