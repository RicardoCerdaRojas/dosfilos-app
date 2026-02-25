export type BibleCategory =
    | 'Pentateuch'
    | 'History'
    | 'Poetry'
    | 'Major Prophets'
    | 'Minor Prophets'
    | 'Gospels'
    | 'Pauline Epistles'
    | 'General Epistles'
    | 'Prophecy';

export interface BookMetadata {
    id: string;
    testament: 'Old' | 'New';
    category: BibleCategory;
    num: number;
}

export const BOOK_METADATA: Record<string, BookMetadata> = {
    // Old Testament
    'GEN': { id: 'GEN', testament: 'Old', category: 'Pentateuch', num: 1 },
    'EXO': { id: 'EXO', testament: 'Old', category: 'Pentateuch', num: 2 },
    'LEV': { id: 'LEV', testament: 'Old', category: 'Pentateuch', num: 3 },
    'NUM': { id: 'NUM', testament: 'Old', category: 'Pentateuch', num: 4 },
    'DEU': { id: 'DEU', testament: 'Old', category: 'Pentateuch', num: 5 },
    'JOS': { id: 'JOS', testament: 'Old', category: 'History', num: 6 },
    'JDG': { id: 'JDG', testament: 'Old', category: 'History', num: 7 },
    'RUT': { id: 'RUT', testament: 'Old', category: 'History', num: 8 },
    '1SA': { id: '1SA', testament: 'Old', category: 'History', num: 9 },
    '2SA': { id: '2SA', testament: 'Old', category: 'History', num: 10 },
    '1KI': { id: '1KI', testament: 'Old', category: 'History', num: 11 },
    '2KI': { id: '2KI', testament: 'Old', category: 'History', num: 12 },
    '1CH': { id: '1CH', testament: 'Old', category: 'History', num: 13 },
    '2CH': { id: '2CH', testament: 'Old', category: 'History', num: 14 },
    'EZR': { id: 'EZR', testament: 'Old', category: 'History', num: 15 },
    'NEH': { id: 'NEH', testament: 'Old', category: 'History', num: 16 },
    'EST': { id: 'EST', testament: 'Old', category: 'History', num: 17 },
    'JOB': { id: 'JOB', testament: 'Old', category: 'Poetry', num: 18 },
    'PSA': { id: 'PSA', testament: 'Old', category: 'Poetry', num: 19 },
    'PRO': { id: 'PRO', testament: 'Old', category: 'Poetry', num: 20 },
    'ECC': { id: 'ECC', testament: 'Old', category: 'Poetry', num: 21 },
    'SON': { id: 'SON', testament: 'Old', category: 'Poetry', num: 22 },
    'ISA': { id: 'ISA', testament: 'Old', category: 'Major Prophets', num: 23 },
    'JER': { id: 'JER', testament: 'Old', category: 'Major Prophets', num: 24 },
    'LAM': { id: 'LAM', testament: 'Old', category: 'Major Prophets', num: 25 },
    'EZE': { id: 'EZE', testament: 'Old', category: 'Major Prophets', num: 26 },
    'DAN': { id: 'DAN', testament: 'Old', category: 'Major Prophets', num: 27 },
    'HOS': { id: 'HOS', testament: 'Old', category: 'Minor Prophets', num: 28 },
    'JOE': { id: 'JOE', testament: 'Old', category: 'Minor Prophets', num: 29 },
    'AMO': { id: 'AMO', testament: 'Old', category: 'Minor Prophets', num: 30 },
    'OBA': { id: 'OBA', testament: 'Old', category: 'Minor Prophets', num: 31 },
    'JON': { id: 'JON', testament: 'Old', category: 'Minor Prophets', num: 32 },
    'MIC': { id: 'MIC', testament: 'Old', category: 'Minor Prophets', num: 33 },
    'NAH': { id: 'NAH', testament: 'Old', category: 'Minor Prophets', num: 34 },
    'HAB': { id: 'HAB', testament: 'Old', category: 'Minor Prophets', num: 35 },
    'ZEP': { id: 'ZEP', testament: 'Old', category: 'Minor Prophets', num: 36 },
    'HAG': { id: 'HAG', testament: 'Old', category: 'Minor Prophets', num: 37 },
    'ZEC': { id: 'ZEC', testament: 'Old', category: 'Minor Prophets', num: 38 },
    'MAL': { id: 'MAL', testament: 'Old', category: 'Minor Prophets', num: 39 },

    // New Testament
    'MAT': { id: 'MAT', testament: 'New', category: 'Gospels', num: 40 },
    'MAR': { id: 'MAR', testament: 'New', category: 'Gospels', num: 41 },
    'LUK': { id: 'LUK', testament: 'New', category: 'Gospels', num: 42 },
    'JOH': { id: 'JOH', testament: 'New', category: 'Gospels', num: 43 },
    'ACT': { id: 'ACT', testament: 'New', category: 'History', num: 44 },
    'ROM': { id: 'ROM', testament: 'New', category: 'Pauline Epistles', num: 45 },
    '1CO': { id: '1CO', testament: 'New', category: 'Pauline Epistles', num: 46 },
    '2CO': { id: '2CO', testament: 'New', category: 'Pauline Epistles', num: 47 },
    'GAL': { id: 'GAL', testament: 'New', category: 'Pauline Epistles', num: 48 },
    'EPH': { id: 'EPH', testament: 'New', category: 'Pauline Epistles', num: 49 },
    'PHI': { id: 'PHI', testament: 'New', category: 'Pauline Epistles', num: 50 },
    'COL': { id: 'COL', testament: 'New', category: 'Pauline Epistles', num: 51 },
    '1TH': { id: '1TH', testament: 'New', category: 'Pauline Epistles', num: 52 },
    '2TH': { id: '2TH', testament: 'New', category: 'Pauline Epistles', num: 53 },
    '1TI': { id: '1TI', testament: 'New', category: 'Pauline Epistles', num: 54 },
    '2TI': { id: '2TI', testament: 'New', category: 'Pauline Epistles', num: 55 },
    'TIT': { id: 'TIT', testament: 'New', category: 'Pauline Epistles', num: 56 },
    'PHM': { id: 'PHM', testament: 'New', category: 'Pauline Epistles', num: 57 },
    'HEB': { id: 'HEB', testament: 'New', category: 'General Epistles', num: 58 },
    'JAM': { id: 'JAM', testament: 'New', category: 'General Epistles', num: 59 },
    '1PE': { id: '1PE', testament: 'New', category: 'General Epistles', num: 60 },
    '2PE': { id: '2PE', testament: 'New', category: 'General Epistles', num: 61 },
    '1JO': { id: '1JO', testament: 'New', category: 'General Epistles', num: 62 },
    '2JO': { id: '2JO', testament: 'New', category: 'General Epistles', num: 63 },
    '3JO': { id: '3JO', testament: 'New', category: 'General Epistles', num: 64 },
    'JUD': { id: 'JUD', testament: 'New', category: 'General Epistles', num: 65 },
    'REV': { id: 'REV', testament: 'New', category: 'Prophecy', num: 66 },
};

/**
 * Maps version-specific IDs to canonical 3-letter IDs
 */
export const getCanonicalId = (id: string, versionId: string): string => {
    const normalized = id.toLowerCase();

    if (versionId === 'RVR1960') {
        const rvrMap: Record<string, string> = {
            'gn': 'GEN', 'ex': 'EXO', 'lv': 'LEV', 'nm': 'NUM', 'dt': 'DEU',
            'js': 'JOS', 'jud': 'JDG', 'rt': 'RUT', '1sm': '1SA', '2sm': '2SA',
            '1kgs': '1KI', '2kgs': '2KI', '1ch': '1CH', '2ch': '2CH', 'ezr': 'EZR',
            'ne': 'NEH', 'et': 'EST', 'job': 'JOB', 'ps': 'PSA', 'prv': 'PRO',
            'ec': 'ECC', 'so': 'SON', 'is': 'ISA', 'jr': 'JER', 'lm': 'LAM',
            'ez': 'EZE', 'dn': 'DAN', 'ho': 'HOS', 'jl': 'JOE', 'am': 'AMO',
            'ob': 'OBA', 'jn': 'JON', 'mi': 'MIC', 'na': 'NAH', 'hk': 'HAB',
            'zp': 'ZEP', 'hg': 'HAG', 'zc': 'ZEC', 'ml': 'MAL', 'mt': 'MAT',
            'mk': 'MAR', 'lk': 'LUK', 'jo': 'JOH', 'act': 'ACT', 'rm': 'ROM',
            '1co': '1CO', '2co': '2CO', 'gl': 'GAL', 'eph': 'EPH', 'ph': 'PHI',
            'col': 'COL', '1ts': '1TH', '2ts': '2TH', '1ti': '1TI', '2ti': '2TI',
            'tit': 'TIT', 'phm': 'PHM', 'hb': 'HEB', 'jm': 'JAM', '1pe': '1PE',
            '2pe': '2PE', '1jo': '1JO', '2jo': '2JO', '3jo': '3JO', 'jd': 'JUD',
            're': 'REV'
        };
        return rvrMap[normalized] || normalized.toUpperCase();
    }

    if (versionId === 'ASV') {
        const asvMap: Record<string, string> = {
            '1': 'GEN', '2': 'EXO', '3': 'LEV', '4': 'NUM', '5': 'DEU',
            '6': 'JOS', '7': 'JDG', '8': 'RUT', '9': '1SA', '10': '2SA',
            '11': '1KI', '12': '2KI', '13': '1CH', '14': '2CH', '15': 'EZR',
            '16': 'NEH', '17': 'EST', '18': 'JOB', '19': 'PSA', '20': 'PRO',
            '21': 'ECC', '22': 'SON', '23': 'ISA', '24': 'JER', '25': 'LAM',
            '26': 'EZE', '27': 'DAN', '28': 'HOS', '29': 'JOE', '30': 'AMO',
            '31': 'OBA', '32': 'JON', '33': 'MIC', '34': 'NAH', '35': 'HAB',
            '36': 'ZEP', '37': 'HAG', '38': 'ZEC', '39': 'MAL', '40': 'MAT',
            '41': 'MAR', '42': 'LUK', '43': 'JOH', '44': 'ACT', '45': 'ROM',
            '46': '1CO', '47': '2CO', '48': 'GAL', '49': 'EPH', '50': 'PHI',
            '51': 'COL', '52': '1TH', '53': '2TH', '54': '1TI', '55': '2TI',
            '56': 'TIT', '57': 'PHM', '58': 'HEB', '59': 'JAM', '60': '1PE',
            '61': '2PE', '62': '1JO', '63': '2JO', '64': '3JO', '65': 'JUD',
            '66': 'REV'
        };
        return asvMap[normalized] || normalized.toUpperCase();
    }
    return normalized.toUpperCase();
};

export const getBookMetadata = (id: string, versionId: string): BookMetadata | null => {
    const canonicalId = getCanonicalId(id, versionId);
    return BOOK_METADATA[canonicalId] || null;
};
