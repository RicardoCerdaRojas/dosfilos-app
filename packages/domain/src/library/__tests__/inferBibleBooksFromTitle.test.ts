import { describe, it, expect } from 'vitest';
import { inferBibleBooksFromTitle } from '../inferBibleBooksFromTitle';

describe('inferBibleBooksFromTitle', () => {
    describe('single-book commentaries', () => {
        it('plain English book name → book scope, single id', () => {
            expect(inferBibleBooksFromTitle('Romans')).toEqual({
                books: ['ROM'],
                inferredScope: 'book',
            });
        });

        it('plain Spanish book name → book scope, single id', () => {
            expect(inferBibleBooksFromTitle('Romanos')).toEqual({
                books: ['ROM'],
                inferredScope: 'book',
            });
        });

        it('book name with chapter range suffix is ignored', () => {
            expect(inferBibleBooksFromTitle('Hebrews 1-8 (WBC 47A)')).toEqual({
                books: ['HEB'],
                inferredScope: 'book',
            });
        });

        it('multi-word book name resolves correctly', () => {
            expect(inferBibleBooksFromTitle('Song of Solomon — Tremper Longman')).toEqual({
                books: ['SNG'],
                inferredScope: 'book',
            });
        });

        it('handles Spanish accents in title', () => {
            expect(inferBibleBooksFromTitle('Comentario sobre Génesis')).toEqual({
                books: ['GEN'],
                inferredScope: 'book',
            });
        });
    });

    describe('numbered books', () => {
        it('"1 Peter" → 1PE', () => {
            expect(inferBibleBooksFromTitle('1 Peter')).toEqual({
                books: ['1PE'],
                inferredScope: 'book',
            });
        });

        it('"2 Peter and Jude" → 2PE + JUD (Jude not Judges)', () => {
            const result = inferBibleBooksFromTitle('2 Peter and Jude (Bauckham, WBC)');
            expect(result.inferredScope).toBe('book');
            expect(result.books).toEqual(['2PE', 'JUD']);
        });

        it('Roman numeral prefix "II Corinthians"', () => {
            expect(inferBibleBooksFromTitle('II Corinthians')).toEqual({
                books: ['2CO'],
                inferredScope: 'book',
            });
        });

        it('Spanish numeric word "Primera Pedro"', () => {
            // Aliases for 1PE include "1 pedro" — primera + pedro should
            // resolve via the numeric-prefix path.
            const result = inferBibleBooksFromTitle('Primera Pedro');
            expect(result.books).toEqual(['1PE']);
            expect(result.inferredScope).toBe('book');
        });
    });

    describe('multi-book phrases', () => {
        it('"The Letters of John" → 1JN, 2JN, 3JN', () => {
            expect(inferBibleBooksFromTitle('The Letters of John (Yarbrough)')).toEqual({
                books: ['1JN', '2JN', '3JN'],
                inferredScope: 'book',
            });
        });

        it('"Cartas de Juan" → 1JN, 2JN, 3JN', () => {
            expect(inferBibleBooksFromTitle('Cartas de Juan')).toEqual({
                books: ['1JN', '2JN', '3JN'],
                inferredScope: 'book',
            });
        });

        it('"Pastoral Epistles" → 1TI, 2TI, TIT', () => {
            expect(inferBibleBooksFromTitle('Pastoral Epistles (Mounce, WBC)')).toEqual({
                books: ['1TI', '2TI', 'TIT'],
                inferredScope: 'book',
            });
        });

        it('"Minor Prophets" → all twelve', () => {
            const result = inferBibleBooksFromTitle('Minor Prophets — Achtemeier');
            expect(result.books).toHaveLength(12);
            expect(result.books[0]).toBe('HOS');
            expect(result.books[result.books.length - 1]).toBe('MAL');
            expect(result.inferredScope).toBe('book');
        });

        it('"Pentateuch" → GEN..DEU', () => {
            expect(inferBibleBooksFromTitle('A Theology of the Pentateuch')).toEqual({
                books: ['GEN', 'EXO', 'LEV', 'NUM', 'DEU'],
                inferredScope: 'book',
            });
        });
    });

    describe('reference works', () => {
        it('BDAG → whole-testament, no specific books', () => {
            expect(inferBibleBooksFromTitle('BDAG')).toEqual({
                books: [],
                inferredScope: 'whole-testament',
            });
        });

        it('Wallace Greek Grammar → whole-testament', () => {
            expect(inferBibleBooksFromTitle('Wallace Greek Grammar Beyond the Basics')).toEqual({
                books: [],
                inferredScope: 'whole-testament',
            });
        });

        it('HALOT → whole-testament', () => {
            expect(inferBibleBooksFromTitle('HALOT')).toEqual({
                books: [],
                inferredScope: 'whole-testament',
            });
        });

        it('Anchor Bible Dictionary → whole-bible', () => {
            expect(inferBibleBooksFromTitle('Anchor Bible Dictionary, vol. 3')).toEqual({
                books: [],
                inferredScope: 'whole-bible',
            });
        });

        it('Systematic Theology → whole-bible', () => {
            expect(inferBibleBooksFromTitle('Grudem Systematic Theology')).toEqual({
                books: [],
                inferredScope: 'whole-bible',
            });
        });

        it('BHQ (full name) → whole-testament', () => {
            expect(inferBibleBooksFromTitle('Biblia Hebraica Quinta — Anthony Gelston')).toEqual({
                books: [],
                inferredScope: 'whole-testament',
            });
        });

        it('BHQ (acronym) → whole-testament', () => {
            expect(inferBibleBooksFromTitle('The Twelve Minor Prophets — BHQ')).toEqual({
                books: [],
                inferredScope: 'whole-testament',
            });
        });

        it('NA29 → whole-testament', () => {
            expect(inferBibleBooksFromTitle('NA29')).toEqual({
                books: [],
                inferredScope: 'whole-testament',
            });
        });

        it('SBLGNT → whole-testament', () => {
            expect(inferBibleBooksFromTitle('SBLGNT')).toEqual({
                books: [],
                inferredScope: 'whole-testament',
            });
        });

        it('Septuaginta (Rahlfs) → whole-testament', () => {
            expect(inferBibleBooksFromTitle('Rahlfs Septuaginta')).toEqual({
                books: [],
                inferredScope: 'whole-testament',
            });
        });

        it('NIDOTTE → whole-testament', () => {
            expect(inferBibleBooksFromTitle('NIDOTTE — VanGemeren')).toEqual({
                books: [],
                inferredScope: 'whole-testament',
            });
        });
    });

    describe('non-matches return empty', () => {
        it('unrelated title returns empty + null scope', () => {
            expect(inferBibleBooksFromTitle('Calvino - Sermones varios')).toEqual({
                books: [],
                inferredScope: null,
            });
        });

        it('empty string returns empty + null scope', () => {
            expect(inferBibleBooksFromTitle('')).toEqual({
                books: [],
                inferredScope: null,
            });
        });

        it('whitespace-only returns empty + null scope', () => {
            expect(inferBibleBooksFromTitle('   ')).toEqual({
                books: [],
                inferredScope: null,
            });
        });
    });

    describe('ambiguity handling — false-positive avoidance', () => {
        it('bare "Jude" resolves to JUD (alias unique enough)', () => {
            // 'jude' is a unique alias for JUD — no collision with JDG
            // (which uses 'jueces', 'judges', 'jue', 'jdg', 'jdc', 'jud').
            // Note: bare 'jud' WOULD collide; bare 'jude' does not.
            expect(inferBibleBooksFromTitle('Jude')).toEqual({
                books: ['JUD'],
                inferredScope: 'book',
            });
        });

        it('bare 1-letter abbreviation does not match without prefix context', () => {
            // 'jn' is shared by JON + JHN — without disambiguating
            // prefix or chapter context, skip rather than guess.
            const result = inferBibleBooksFromTitle('jn');
            expect(result.books).toEqual([]);
        });

        it('numbered-book whole alias "1 Peter" resolves directly', () => {
            // Distinct from the prefix-then-name path; '1 peter' is a
            // pre-baked alias on 1PE.
            expect(inferBibleBooksFromTitle('1 Peter Commentary')).toEqual({
                books: ['1PE'],
                inferredScope: 'book',
            });
        });
    });

    describe('order preservation + dedup', () => {
        it('returns books in first-seen order', () => {
            expect(inferBibleBooksFromTitle('Hebrews and Romans')).toEqual({
                books: ['HEB', 'ROM'],
                inferredScope: 'book',
            });
        });

        it('de-duplicates repeated mentions', () => {
            expect(inferBibleBooksFromTitle('Romans, Romans, Romans')).toEqual({
                books: ['ROM'],
                inferredScope: 'book',
            });
        });
    });
});

describe('títulos con puntuación', () => {
    it('lee «Jude-2 Peter, Volume 50 (WBC)» — el guion pegado rompía todo', () => {
        // Los tokens eran `jude-2` y `peter,`, que no son nada. Este
        // título estuvo en la biblioteca real sin ningún libro asignado.
        const r = inferBibleBooksFromTitle('Jude-2 Peter, Volume 50 (Word Biblical Commentary)');
        expect(r.books).toEqual(['JUD', '2PE']);
        expect(r.inferredScope).toBe('book');
    });

    it('los paréntesis no esconden el libro', () => {
        expect(inferBibleBooksFromTitle('Hebrews (WBC 47A)').books).toEqual(['HEB']);
    });
});

describe('obras de referencia en español', () => {
    it.each([
        ['Gramática Griega', 'whole-testament'],
        ['Grauman - Griego para pastores Gramática 1-12', 'whole-testament'],
        ['Léxico Griego-Español', 'whole-testament'],
        ['Lexicón Hebreo-Arameo-Español', 'whole-testament'],
        ['Barrick & Busenitz - Gramática para Hebreo Bíblico', 'whole-testament'],
        ['Diccionario Teologico del NT', 'whole-testament'],
        ['A Textual Commentary on the Greek New Testament (UBS4)', 'whole-testament'],
        ['Hodge - Teología Sistemática Tomo I', 'whole-bible'],
        ['Ryrie - Teología Básica', 'whole-bible'],
        ['Grudem - Doctrina Biblica', 'whole-bible'],
        ['Terry - La Hermenéutica', 'whole-bible'],
    ])('%s → %s', (titulo, esperado) => {
        const r = inferBibleBooksFromTitle(titulo);
        expect(r.inferredScope).toBe(esperado);
        expect(r.books).toEqual([]);
    });

    it('lo que NO es obra de referencia bíblica sigue sin ámbito', () => {
        // Homilética, consejería y matrimonio no hablan de un pasaje:
        // quedan fuera del corpus de un paper, que es lo correcto.
        for (const t of ['MacArthur - La Predicación', 'Manual Del Consejero Cristiano',
                         'Preparando el matrimonio en el camino de Dios', 'Guía de estilo TMS 2024–2025']) {
            expect(inferBibleBooksFromTitle(t).inferredScope).toBeNull();
        }
    });
});
