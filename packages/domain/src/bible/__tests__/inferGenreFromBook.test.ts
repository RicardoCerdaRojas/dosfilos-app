import { describe, it, expect } from 'vitest';
import { inferGenreFromBook, LITERARY_GENRE_LABELS_ES } from '../inferGenreFromBook';

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
