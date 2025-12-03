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

// Map full Spanish book names to the IDs used in the JSON
const BOOK_MAPPING: Record<string, string> = {
    'Génesis': 'gn', 'Exodo': 'ex', 'Éxodo': 'ex', 'Levítico': 'lv', 'Numeros': 'nm', 'Números': 'nm', 'Deuteronomio': 'dt',
    'Josué': 'js', 'Jueces': 'jud', 'Rut': 'rt', '1 Samuel': '1sm', '2 Samuel': '2sm', '1 Reyes': '1kgs', '2 Reyes': '2kgs', '1 Crónicas': '1ch', '2 Crónicas': '2ch',
    'Esdras': 'ezr', 'Nehemías': 'ne', 'Ester': 'et', 'Job': 'job', 'Salmos': 'ps', 'Proverbios': 'prv', 'Eclesiastés': 'ec', 'Cantares': 'so',
    'Isaías': 'is', 'Jeremías': 'jr', 'Lamentaciones': 'lm', 'Ezequiel': 'ez', 'Daniel': 'dn', 'Oseas': 'ho', 'Joel': 'jl', 'Amós': 'am', 'Abdías': 'ob', 'Jonás': 'jn', 'Miqueas': 'mi', 'Nahúm': 'na', 'Habacuc': 'hk', 'Sofonías': 'zp', 'Hageo': 'hg', 'Zacarías': 'zc', 'Malaquías': 'ml',
    'Mateo': 'mt', 'Marcos': 'mk', 'Lucas': 'lk', 'Juan': 'jo', 'Hechos': 'act', 'Romanos': 'rm', '1 Corintios': '1co', '2 Corintios': '2co', 'Gálatas': 'gl', 'Efesios': 'eph', 'Filipenses': 'ph', 'Colosenses': 'col',
    '1 Tesalonicenses': '1ts', '2 Tesalonicenses': '2ts', '1 Timoteo': '1ti', '2 Timoteo': '2ti', 'Tito': 'tit', 'Filemón': 'phm', 'Hebreos': 'hb', 'Santiago': 'jm',
    '1 Pedro': '1pe', '2 Pedro': '2pe', '1 Juan': '1jo', '2 Juan': '2jo', '3 Juan': '3jo', 'Judas': 'jd', 'Apocalipsis': 're'
};

export class LocalBibleService {
    static parseReference(ref: string): BibleReference | null {
        // Regex to capture book name (including number prefix), chapter, and verse(s)
        // Matches: "1 Juan 3:16" or "Juan 3:16-18"
        const match = ref.match(/^((?:[1-3]\s)?[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)\s(\d+):(\d+)(?:-(\d+))?$/);

        if (!match) return null;

        return {
            book: match[1] || '',
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
        // The JSON structure is an array of objects: { id: "gn", chapters: [ [ "verse 1", ... ], ... ] }
        const bookData = (rvrBible as any[]).find(b => b.id === bookId);
        if (!bookData) return null;

        // Chapters are 0-indexed in the array? Let's check the JSON.
        // Looking at the JSON snippet:
        // "chapters": [ [ "EN el principio...", ... ], ... ]
        // It seems chapter 1 is at index 0.
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
}
