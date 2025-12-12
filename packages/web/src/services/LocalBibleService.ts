import rvrBible from '@/assets/bible/rvr1960.json';

export interface BibleVerse {
    book: string;
    chapter: number;
    verse: number;
    text: string;
}

export interface BibleReference {
    book: string;
    chapter: number;
    verseStart: number;
    verseEnd?: number;
}

// Comprehensive map of Spanish book names and abbreviations to JSON IDs
// Includes: Full names, common abbreviations, alternate spellings
const BOOK_MAPPING: Record<string, string> = {
    // Antiguo Testamento
    // Génesis
    'Génesis': 'gn', 'Genesis': 'gn', 'Gén': 'gn', 'Gen': 'gn', 'Gn': 'gn',
    // Éxodo
    'Éxodo': 'ex', 'Exodo': 'ex', 'Éx': 'ex', 'Ex': 'ex',
    // Levítico
    'Levítico': 'lv', 'Levitico': 'lv', 'Lev': 'lv', 'Lv': 'lv',
    // Números
    'Números': 'nm', 'Numeros': 'nm', 'Núm': 'nm', 'Num': 'nm', 'Nm': 'nm',
    // Deuteronomio
    'Deuteronomio': 'dt', 'Deut': 'dt', 'Dt': 'dt',
    // Josué
    'Josué': 'js', 'Josue': 'js', 'Jos': 'js',
    // Jueces
    'Jueces': 'jud', 'Jue': 'jud', 'Jc': 'jud',
    // Rut
    'Rut': 'rt', 'Rt': 'rt',
    // 1-2 Samuel
    '1 Samuel': '1sm', '1Samuel': '1sm', '1Sam': '1sm', '1 Sam': '1sm', '1S': '1sm', '1 S': '1sm',
    '2 Samuel': '2sm', '2Samuel': '2sm', '2Sam': '2sm', '2 Sam': '2sm', '2S': '2sm', '2 S': '2sm',
    // 1-2 Reyes
    '1 Reyes': '1kgs', '1Reyes': '1kgs', '1Rey': '1kgs', '1 Rey': '1kgs', '1R': '1kgs', '1 R': '1kgs',
    '2 Reyes': '2kgs', '2Reyes': '2kgs', '2Rey': '2kgs', '2 Rey': '2kgs', '2R': '2kgs', '2 R': '2kgs',
    // 1-2 Crónicas
    '1 Crónicas': '1ch', '1 Cronicas': '1ch', '1Crónicas': '1ch', '1Cronicas': '1ch', '1Cr': '1ch', '1 Cr': '1ch',
    '2 Crónicas': '2ch', '2 Cronicas': '2ch', '2Crónicas': '2ch', '2Cronicas': '2ch', '2Cr': '2ch', '2 Cr': '2ch',
    // Esdras
    'Esdras': 'ezr', 'Esd': 'ezr', 'Ezr': 'ezr',
    // Nehemías
    'Nehemías': 'ne', 'Nehemias': 'ne', 'Neh': 'ne', 'Ne': 'ne',
    // Ester
    'Ester': 'et', 'Est': 'et', 'Et': 'et',
    // Job
    'Job': 'job', 'Jb': 'job',
    // Salmos
    'Salmos': 'ps', 'Salmo': 'ps', 'Sal': 'ps', 'Sl': 'ps', 'Ps': 'ps',
    // Proverbios
    'Proverbios': 'prv', 'Prov': 'prv', 'Pr': 'prv', 'Prv': 'prv',
    // Eclesiastés
    'Eclesiastés': 'ec', 'Eclesiastes': 'ec', 'Ecl': 'ec', 'Ec': 'ec',
    // Cantares
    'Cantares': 'so', 'Cantar': 'so', 'Cnt': 'so', 'Ct': 'so', 'Cantar de los Cantares': 'so',
    // Isaías
    'Isaías': 'is', 'Isaias': 'is', 'Is': 'is', 'Isa': 'is',
    // Jeremías
    'Jeremías': 'jr', 'Jeremias': 'jr', 'Jer': 'jr', 'Jr': 'jr',
    // Lamentaciones
    'Lamentaciones': 'lm', 'Lam': 'lm', 'Lm': 'lm',
    // Ezequiel
    'Ezequiel': 'ez', 'Ezeq': 'ez', 'Ez': 'ez',
    // Daniel
    'Daniel': 'dn', 'Dan': 'dn', 'Dn': 'dn',
    // Oseas
    'Oseas': 'ho', 'Os': 'ho',
    // Joel
    'Joel': 'jl', 'Jl': 'jl',
    // Amós
    'Amós': 'am', 'Amos': 'am', 'Am': 'am',
    // Abdías
    'Abdías': 'ob', 'Abdias': 'ob', 'Abd': 'ob', 'Ab': 'ob',
    // Jonás
    'Jonás': 'jn', 'Jonas': 'jn', 'Jon': 'jn',
    // Miqueas
    'Miqueas': 'mi', 'Miq': 'mi', 'Mi': 'mi',
    // Nahúm
    'Nahúm': 'na', 'Nahum': 'na', 'Nah': 'na', 'Na': 'na',
    // Habacuc
    'Habacuc': 'hk', 'Hab': 'hk',
    // Sofonías
    'Sofonías': 'zp', 'Sofonias': 'zp', 'Sof': 'zp',
    // Hageo
    'Hageo': 'hg', 'Hag': 'hg',
    // Zacarías
    'Zacarías': 'zc', 'Zacarias': 'zc', 'Zac': 'zc', 'Zc': 'zc',
    // Malaquías
    'Malaquías': 'ml', 'Malaquias': 'ml', 'Mal': 'ml',

    // Nuevo Testamento
    // Mateo
    'Mateo': 'mt', 'Mat': 'mt', 'Mt': 'mt',
    // Marcos
    'Marcos': 'mk', 'Mar': 'mk', 'Mc': 'mk', 'Mr': 'mk',
    // Lucas
    'Lucas': 'lk', 'Luc': 'lk', 'Lc': 'lk',
    // Juan (Evangelio)
    'Juan': 'jo', 'Jn': 'jo',
    // Hechos
    'Hechos': 'act', 'Hch': 'act', 'Hec': 'act',
    // Romanos
    'Romanos': 'rm', 'Rom': 'rm', 'Ro': 'rm', 'Rm': 'rm',
    // 1-2 Corintios
    '1 Corintios': '1co', '1Corintios': '1co', '1Cor': '1co', '1 Cor': '1co', '1Co': '1co', '1 Co': '1co',
    '2 Corintios': '2co', '2Corintios': '2co', '2Cor': '2co', '2 Cor': '2co', '2Co': '2co', '2 Co': '2co',
    // Gálatas
    'Gálatas': 'gl', 'Galatas': 'gl', 'Gál': 'gl', 'Gal': 'gl', 'Ga': 'gl',
    // Efesios
    'Efesios': 'eph', 'Ef': 'eph', 'Efe': 'eph',
    // Filipenses
    'Filipenses': 'ph', 'Fil': 'ph', 'Fp': 'ph',
    // Colosenses
    'Colosenses': 'col', 'Col': 'col',
    // 1-2 Tesalonicenses
    '1 Tesalonicenses': '1ts', '1Tesalonicenses': '1ts', '1Tes': '1ts', '1 Tes': '1ts', '1Ts': '1ts', '1 Ts': '1ts',
    '2 Tesalonicenses': '2ts', '2Tesalonicenses': '2ts', '2Tes': '2ts', '2 Tes': '2ts', '2Ts': '2ts', '2 Ts': '2ts',
    // 1-2 Timoteo
    '1 Timoteo': '1ti', '1Timoteo': '1ti', '1Tim': '1ti', '1 Tim': '1ti', '1Ti': '1ti', '1 Ti': '1ti',
    '2 Timoteo': '2ti', '2Timoteo': '2ti', '2Tim': '2ti', '2 Tim': '2ti', '2Ti': '2ti', '2 Ti': '2ti',
    // Tito
    'Tito': 'tit', 'Tit': 'tit', 'Ti': 'tit',
    // Filemón
    'Filemón': 'phm', 'Filemon': 'phm', 'Flm': 'phm', 'Flmn': 'phm',
    // Hebreos
    'Hebreos': 'hb', 'Heb': 'hb', 'He': 'hb',
    // Santiago
    'Santiago': 'jm', 'Sant': 'jm', 'Stg': 'jm',
    // 1-2 Pedro
    '1 Pedro': '1pe', '1Pedro': '1pe', '1Ped': '1pe', '1 Ped': '1pe', '1Pe': '1pe', '1 Pe': '1pe', '1P': '1pe', '1 P': '1pe',
    '2 Pedro': '2pe', '2Pedro': '2pe', '2Ped': '2pe', '2 Ped': '2pe', '2Pe': '2pe', '2 Pe': '2pe', '2P': '2pe', '2 P': '2pe',
    // 1-2-3 Juan (Epístolas)
    '1 Juan': '1jo', '1Juan': '1jo', '1Jn': '1jo', '1 Jn': '1jo',
    '2 Juan': '2jo', '2Juan': '2jo', '2Jn': '2jo', '2 Jn': '2jo',
    '3 Juan': '3jo', '3Juan': '3jo', '3Jn': '3jo', '3 Jn': '3jo',
    // Judas
    'Judas': 'jd', 'Jud': 'jd',
    // Apocalipsis
    'Apocalipsis': 're', 'Apoc': 're', 'Ap': 're'
};

// Generate all book name patterns for regex matching
function getAllBookPatterns(): string {
    const uniquePatterns = new Set<string>();
    for (const bookName of Object.keys(BOOK_MAPPING)) {
        uniquePatterns.add(bookName);
    }
    // Sort by length (longest first) to match longer names before shorter abbreviations
    return Array.from(uniquePatterns)
        .sort((a, b) => b.length - a.length)
        .join('|');
}

// Cached pattern for performance
let cachedBookPattern: string | null = null;
export function getBookPattern(): string {
    if (!cachedBookPattern) {
        cachedBookPattern = getAllBookPatterns();
    }
    return cachedBookPattern;
}

export class LocalBibleService {
    static parseReference(ref: string): BibleReference | null {
        // Normalize the reference string
        const normalized = ref.trim();

        // Regex to capture book name (including number prefix), chapter, and verse(s)
        // Supports formats: "Juan 3:16", "Jn 3:16", "1 Juan 3:16-18", "1Jn 3:16", etc.
        // Also supports dot separator: "Jn 3.16"
        const match = normalized.match(/^((?:[1-3]\s?)?[A-ZÁÉÍÓÚÑa-záéíóúñ]+(?:\s+de\s+los\s+[A-ZÁÉÍÓÚÑa-záéíóúñ]+)?)\s*(\d+)[:.](\d+)(?:[-–](\d+))?$/i);

        if (!match) return null;

        const bookName = match[1]?.trim() || '';

        // Check if book exists in mapping (case-insensitive lookup)
        let resolvedBook = '';
        for (const [key, _value] of Object.entries(BOOK_MAPPING)) {
            if (key.toLowerCase() === bookName.toLowerCase()) {
                resolvedBook = key;
                break;
            }
        }

        if (!resolvedBook) return null;

        return {
            book: resolvedBook,
            chapter: parseInt(match[2] || '0'),
            verseStart: parseInt(match[3] || '0'),
            verseEnd: match[4] ? parseInt(match[4]) : undefined
        };
    }

    static getVerses(refString: string): string | null {
        const ref = this.parseReference(refString);
        if (!ref) return null;

        const bookId = BOOK_MAPPING[ref.book];
        if (!bookId) return null;

        // Find the book in the JSON data
        const bookData = (rvrBible as any[]).find(b => b.id === bookId);
        if (!bookData) return null;

        // Chapters are 0-indexed in the array
        const chapterIndex = ref.chapter - 1;
        if (chapterIndex < 0 || chapterIndex >= bookData.chapters.length) return null;

        const chapterVerses = bookData.chapters[chapterIndex];

        // Verses are also in an array, so verse 1 is at index 0.
        const startVerseIndex = ref.verseStart - 1;
        if (startVerseIndex < 0 || startVerseIndex >= chapterVerses.length) return null;

        let text = '';

        if (ref.verseEnd) {
            const endVerseIndex = Math.min(ref.verseEnd - 1, chapterVerses.length - 1);
            for (let i = startVerseIndex; i <= endVerseIndex; i++) {
                const verseNum = i + 1;
                text += `${verseNum} ${chapterVerses[i]} `;
            }
        } else {
            text = chapterVerses[startVerseIndex];
        }

        return text.trim();
    }

    /** Check if a book name/abbreviation is valid */
    static isValidBook(bookName: string): boolean {
        const normalized = bookName.trim().toLowerCase();
        return Object.keys(BOOK_MAPPING).some(key => key.toLowerCase() === normalized);
    }

    /** Get the canonical (full) name for a book abbreviation */
    static getCanonicalBookName(bookName: string): string | null {
        const normalized = bookName.trim().toLowerCase();
        for (const [key, value] of Object.entries(BOOK_MAPPING)) {
            if (key.toLowerCase() === normalized) {
                // Find the full name with the same value
                for (const [fullName, id] of Object.entries(BOOK_MAPPING)) {
                    if (id === value && fullName.length > key.length) {
                        // Prefer accentuated versions
                        if (!fullName.includes('á') && !fullName.includes('é') &&
                            !fullName.includes('í') && !fullName.includes('ó') &&
                            !fullName.includes('ú')) continue;
                        return fullName;
                    }
                }
                return key; // Return the matched key if no longer name found
            }
        }
        return null;
    }
}

