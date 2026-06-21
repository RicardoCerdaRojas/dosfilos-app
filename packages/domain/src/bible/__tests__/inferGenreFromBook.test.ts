import { describe, it, expect } from 'vitest';
import { detectGenreInText, inferGenreFromBook, LITERARY_GENRE_LABELS_ES } from '../inferGenreFromBook';

describe('inferGenreFromBook', () => {
    it('classifies representative books across genres', () => {
        expect(inferGenreFromBook('GEN')).toBe('narrative');
        expect(inferGenreFromBook('LEV')).toBe('law');
        expect(inferGenreFromBook('PSA')).toBe('poetry');
        expect(inferGenreFromBook('PRO')).toBe('wisdom');
        expect(inferGenreFromBook('ISA')).toBe('prophecy');
        expect(inferGenreFromBook('DAN')).toBe('mixed');
        expect(inferGenreFromBook('JHN')).toBe('gospel');
        expect(inferGenreFromBook('ACT')).toBe('narrative');
        expect(inferGenreFromBook('ROM')).toBe('epistle');
        expect(inferGenreFromBook('REV')).toBe('apocalypse');
    });

    it('has a Spanish label for every genre value it can return', () => {
        // Spot-check a couple of returned genres map to a label.
        expect(LITERARY_GENRE_LABELS_ES[inferGenreFromBook('ROM')]).toBe('Epístola');
        expect(LITERARY_GENRE_LABELS_ES[inferGenreFromBook('PSA')]).toBe('Poesía');
    });
});

describe('detectGenreInText', () => {
    it('recognizes the genre the pastor names (accent-insensitive)', () => {
        expect(detectGenreInText('Es una Epístola enviada a la iglesia')).toBe('epistle');
        expect(detectGenreInText('esto es una carta a los corintios')).toBe('epistle');
        expect(detectGenreInText('es un evangelio sobre Jesús')).toBe('gospel');
        expect(detectGenreInText('es profecia, un oraculo de juicio')).toBe('prophecy');
        expect(detectGenreInText('es un salmo, poesia para cantar')).toBe('poetry');
        expect(detectGenreInText('un proverbio de sabiduria')).toBe('wisdom');
        expect(detectGenreInText('es una narracion, un relato historico')).toBe('narrative');
        expect(detectGenreInText('es ley, un mandamiento del Levitico')).toBe('law');
        expect(detectGenreInText('es apocalipsis, lenguaje apocaliptico')).toBe('apocalypse');
    });

    it('matches whole words only (no "ley" inside "leyendo")', () => {
        expect(detectGenreInText('estuve leyendo el pasaje con calma')).toBeNull();
    });

    it('returns null when the prose names no genre', () => {
        expect(detectGenreInText('habla de cómo vivir el tiempo presente')).toBeNull();
    });

    it('returns null when the prose names several genres (ambiguous)', () => {
        expect(detectGenreInText('no es profecía sino una epístola')).toBeNull();
    });

    it('returns null for empty input', () => {
        expect(detectGenreInText('')).toBeNull();
        expect(detectGenreInText('   ')).toBeNull();
    });
});
