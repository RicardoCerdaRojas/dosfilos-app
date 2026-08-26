import { describe, it, expect } from 'vitest';
import { parseMorphGntPos, parseMorphGntParsing } from '../parseMorphGntCode';
import { transliterateGreek } from '../transliterateGreek';

describe('parseMorphGntCode — líneas reales de Santiago 1', () => {
    it('sustantivo nominativo singular masculino (Ἰάκωβος, "N- ----NSM-")', () => {
        expect(parseMorphGntPos('N-')).toBe('N');
        expect(parseMorphGntParsing('----NSM-')).toEqual({
            person: undefined, tense: undefined, voice: undefined, mood: undefined,
            case: 'N', number: 'S', gender: 'M', degree: undefined,
        });
    });

    it('verbo 2ª aoristo media imperativo plural (ἡγήσασθε, "V- 2AMD-P--")', () => {
        const tag = parseMorphGntParsing('2AMD-P--');
        expect(tag.person).toBe('2');
        expect(tag.tense).toBe('A');
        expect(tag.voice).toBe('M');
        expect(tag.mood).toBe('D');
        expect(tag.number).toBe('P');
        expect(tag.case).toBeUndefined();
    });

    it('infinitivo presente activo (χαίρειν, "-PAN----")', () => {
        const tag = parseMorphGntParsing('-PAN----');
        expect(tag).toMatchObject({ tense: 'P', voice: 'A', mood: 'N' });
    });

    it('el artículo es RA y la conjunción C con parsing vacío', () => {
        expect(parseMorphGntPos('RA')).toBe('RA');
        expect(parseMorphGntPos('C-')).toBe('C');
        expect(parseMorphGntParsing('--------')).toEqual({
            person: undefined, tense: undefined, voice: undefined, mood: undefined,
            case: undefined, number: undefined, gender: undefined, degree: undefined,
        });
    });

    it('un pos desconocido no se inventa', () => {
        expect(parseMorphGntPos('Z-')).toBeUndefined();
    });
});

describe('transliterateGreek — convención SBL', () => {
    it('palabras de Santiago 1:1', () => {
        expect(transliterateGreek('Ἰάκωβος')).toBe('Iakōbos');
        expect(transliterateGreek('θεοῦ')).toBe('theou');
        expect(transliterateGreek('Χριστοῦ')).toBe('Christou');
        expect(transliterateGreek('χαίρειν')).toBe('chairein');
        expect(transliterateGreek('διασπορᾷ')).toBe('diasporai');
    });

    it('espíritu áspero: h inicial, también sobre diptongo', () => {
        expect(transliterateGreek('ὁ')).toBe('ho');
        expect(transliterateGreek('ὑπομονήν')).toBe('hypomonēn');
        expect(transliterateGreek('οὗ')).toBe('hou');
    });

    it('gamma nasal y rho áspera', () => {
        expect(transliterateGreek('ἄγγελος')).toBe('angelos');
        expect(transliterateGreek('ῥῆμα')).toBe('rhēma');
    });

    it('ípsilon: y sola, u en diptongo', () => {
        expect(transliterateGreek('αὐτός')).toBe('autos');
        expect(transliterateGreek('κυρίου')).toBe('kyriou');
    });

    it('conserva la puntuación pegada a la palabra', () => {
        expect(transliterateGreek('χαίρειν.')).toBe('chairein.');
    });
});
