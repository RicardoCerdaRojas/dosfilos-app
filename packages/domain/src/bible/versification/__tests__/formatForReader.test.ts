import { describe, it, expect } from 'vitest';
import {
    formatPassageForReader,
    rangeToOriginal,
    rangeToReader,
} from '../formatForReader';
import { formatPassageReference } from '../../canon/passage-reference';
import type { PassageReference } from '../../canon/passage-reference';

const jonas2 = (): PassageReference => ({
    bookId: 'JON', chapterStart: 2, chapterEnd: 2, verseStart: 1, verseEnd: 11,
});

describe('formatPassageForReader — el rótulo que ve el pastor', () => {
    it('imprime la perícopa de Jonás en la numeración de su Biblia', () => {
        // Guardado: TM 2:1-11. Leído: RVR 1:17-2:10.
        expect(formatPassageForReader(jonas2(), 'es')).toBe('Jonás 1:17-2:10');
    });

    it('el formateador crudo sigue imprimiendo el original, y eso es correcto', () => {
        // Las dos funciones conviven: el paper académico cita el Masorético.
        expect(formatPassageReference(jonas2(), 'es')).toBe('Jonás 2:1-11');
    });

    it('no toca los pasajes donde las dos numeraciones coinciden', () => {
        const romanos: PassageReference = {
            bookId: 'ROM', chapterStart: 8, chapterEnd: 8, verseStart: 28, verseEnd: 30,
        };
        expect(formatPassageForReader(romanos, 'es')).toBe(formatPassageReference(romanos, 'es'));
    });
});

describe('rangeToReader / rangeToOriginal — el planificador', () => {
    it('traduce el tramo del detector a la numeración del lector', () => {
        expect(rangeToReader('JON', { chapterStart: 2, verseStart: 1, chapterEnd: 2, verseEnd: 11 }))
            .toEqual({
                chapterStart: 1, verseStart: 17,
                chapterEnd: 2, verseEnd: 10,
                differsFromOriginal: true,
            });
    });

    it('vuelve a coordenadas del original al guardar lo que el pastor editó', () => {
        // Sin esta vuelta, escribir «1:17» pensando en el pez guardaría el
        // 1:17 del Masorético, que es otro versículo.
        expect(rangeToOriginal('JON', { chapterStart: 1, verseStart: 17, chapterEnd: 2, verseEnd: 10 }))
            .toEqual({ chapterStart: 2, verseStart: 1, chapterEnd: 2, verseEnd: 11 });
    });

    it('la edición de fronteras es fiel en la ida y la vuelta', () => {
        const original = { chapterStart: 2, verseStart: 1, chapterEnd: 2, verseEnd: 11 };
        const { differsFromOriginal, ...lector } = rangeToReader('JON', original);

        expect(differsFromOriginal).toBe(true);
        expect(rangeToOriginal('JON', lector)).toEqual(original);
    });

    it('marca cuándo NO hay diferencia, para no mostrar avisos de más', () => {
        const r = rangeToReader('JON', { chapterStart: 3, verseStart: 1, chapterEnd: 3, verseEnd: 10 });
        expect(r.differsFromOriginal).toBe(false);
    });

    it('la división que el fundador quería queda bien de los dos lados', () => {
        // Estudio 1: RVR 1:1-16 (igual en las dos). Estudio 2: RVR 1:17-2:10.
        expect(rangeToReader('JON', { chapterStart: 1, verseStart: 1, chapterEnd: 1, verseEnd: 16 }))
            .toMatchObject({ chapterStart: 1, verseStart: 1, chapterEnd: 1, verseEnd: 16 });

        expect(rangeToOriginal('JON', { chapterStart: 1, verseStart: 1, chapterEnd: 1, verseEnd: 16 }))
            .toEqual({ chapterStart: 1, verseStart: 1, chapterEnd: 1, verseEnd: 16 });
    });

    it('Salmos: el título entra como versículo 0 del lector', () => {
        expect(rangeToReader('PSA', { chapterStart: 3, verseStart: 1, chapterEnd: 3, verseEnd: 9 }))
            .toEqual({
                chapterStart: 3, verseStart: 0,
                chapterEnd: 3, verseEnd: 8,
                differsFromOriginal: true,
            });
    });
});
