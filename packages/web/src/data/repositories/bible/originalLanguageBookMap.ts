import type { BibleBookId } from '@dosfilos/domain';

/**
 * Translates the web's canonical 3-letter book id (defined in
 * `web/src/domain/bible/utils/BibleMetadata.ts` — uses MAR/JOH/PHI/
 * JAM/1JO/2JO/3JO/SON/EZE/JOE/NAH) into the SBL standard canonical
 * `BibleBookId` (domain type — uses MRK/JHN/PHP/JAS/1JN/2JN/3JN/
 * SNG/EZK/JOL/NAM). The two systems agree on the majority of books
 * but diverge on ~11 entries — which is why this map exists.
 */
export const WEB_TO_SBL: Record<string, BibleBookId> = {
    GEN: 'GEN', EXO: 'EXO', LEV: 'LEV', NUM: 'NUM', DEU: 'DEU',
    JOS: 'JOS', JDG: 'JDG', RUT: 'RUT',
    '1SA': '1SA', '2SA': '2SA', '1KI': '1KI', '2KI': '2KI', '1CH': '1CH', '2CH': '2CH',
    EZR: 'EZR', NEH: 'NEH', EST: 'EST',
    JOB: 'JOB', PSA: 'PSA', PRO: 'PRO', ECC: 'ECC',
    SON: 'SNG',
    ISA: 'ISA', JER: 'JER', LAM: 'LAM',
    EZE: 'EZK',
    DAN: 'DAN', HOS: 'HOS',
    JOE: 'JOL',
    AMO: 'AMO', OBA: 'OBA', JON: 'JON', MIC: 'MIC',
    NAH: 'NAM',
    HAB: 'HAB', ZEP: 'ZEP', HAG: 'HAG', ZEC: 'ZEC', MAL: 'MAL',
    MAT: 'MAT',
    MAR: 'MRK',
    LUK: 'LUK',
    JOH: 'JHN',
    ACT: 'ACT', ROM: 'ROM',
    '1CO': '1CO', '2CO': '2CO', GAL: 'GAL', EPH: 'EPH',
    PHI: 'PHP',
    COL: 'COL', '1TH': '1TH', '2TH': '2TH', '1TI': '1TI', '2TI': '2TI', TIT: 'TIT', PHM: 'PHM',
    HEB: 'HEB',
    JAM: 'JAS',
    '1PE': '1PE', '2PE': '2PE',
    '1JO': '1JN', '2JO': '2JN', '3JO': '3JN',
    JUD: 'JUD', REV: 'REV',
};

/**
 * Inverse of WEB_TO_SBL — used to convert the SBL `BibleBookId` we
 * receive from the original-language providers back into the web's
 * canonical convention so it can be displayed in the existing
 * BibleReader DOM (which uses web canonical for ids and lookups).
 */
export const SBL_TO_WEB: Record<BibleBookId, string> = Object.fromEntries(
    Object.entries(WEB_TO_SBL).map(([web, sbl]) => [sbl, web]),
) as Record<BibleBookId, string>;
