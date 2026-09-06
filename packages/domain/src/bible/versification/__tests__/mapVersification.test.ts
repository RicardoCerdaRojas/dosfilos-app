import { describe, it, expect } from 'vitest';
import {
    bookHasVersificationDifferences,
    passageToOriginal,
    passageToReader,
    verseToOriginal,
    verseToReader,
} from '../mapVersification';
import { VERSIFICATION_SPANS } from '../versificationMap';
import type { PassageReference } from '../../canon/passage-reference';

const passage = (
    bookId: PassageReference['bookId'],
    chapterStart: number,
    verseStart: number | null,
    chapterEnd: number,
    verseEnd: number | null,
): PassageReference => ({ bookId, chapterStart, chapterEnd, verseStart, verseEnd });

describe('Jonás — el caso que destapó todo', () => {
    it('el pez es 2:1 en hebreo y 1:17 en castellano', () => {
        expect(verseToReader('JON', 2, 1)).toEqual({ chapter: 1, verse: 17, differs: true });
        expect(verseToOriginal('JON', 1, 17)).toEqual({ chapter: 2, verse: 1, differs: true });
    });

    it('el resto del capítulo 2 va corrido en uno', () => {
        expect(verseToReader('JON', 2, 2)).toEqual({ chapter: 2, verse: 1, differs: true });
        expect(verseToReader('JON', 2, 11)).toEqual({ chapter: 2, verse: 10, differs: true });
        expect(verseToOriginal('JON', 2, 10)).toEqual({ chapter: 2, verse: 11, differs: true });
    });

    it('el paper de TM 2:1-11 es RVR 1:17-2:10', () => {
        // La perícopa real del fundador. En hebreo cubre del pez al vómito;
        // en su Biblia cruza el final del capítulo 1.
        const result = passageToReader(passage('JON', 2, 1, 2, 11));

        expect(result.passage).toMatchObject({
            chapterStart: 1, verseStart: 17,
            chapterEnd: 2, verseEnd: 10,
        });
        expect(result.differs).toBe(true);
        expect(result.crossesChapterBoundary).toBe(true);
    });

    it('vuelve intacto en el viaje de ida y vuelta', () => {
        const original = passage('JON', 2, 1, 2, 11);
        const roundTrip = passageToOriginal(passageToReader(original).passage).passage;
        expect(roundTrip).toEqual(original);
    });

    it('los capítulos 3 y 4 de Jonás no se mueven', () => {
        expect(verseToReader('JON', 3, 10)).toEqual({ chapter: 3, verse: 10, differs: false });
        expect(verseToReader('JON', 4, 11)).toEqual({ chapter: 4, verse: 11, differs: false });
    });
});

describe('Salmos — el título es el versículo 0, no un error', () => {
    it('el título del Salmo 3 es TM 3:1 y en castellano no lleva número', () => {
        expect(verseToReader('PSA', 3, 1)).toEqual({ chapter: 3, verse: 0, differs: true });
    });

    it('el cuerpo del salmo va corrido en uno', () => {
        expect(verseToReader('PSA', 3, 2)).toEqual({ chapter: 3, verse: 1, differs: true });
        expect(verseToOriginal('PSA', 3, 1)).toEqual({ chapter: 3, verse: 2, differs: true });
    });

    it('los salmos sin título no se mueven', () => {
        // El Salmo 1 no lleva encabezado, así que las dos numeraciones coinciden.
        expect(verseToReader('PSA', 1, 1)).toEqual({ chapter: 1, verse: 1, differs: false });
    });
});

describe('libros sin diferencia', () => {
    it('el Nuevo Testamento no se toca', () => {
        expect(bookHasVersificationDifferences('ROM')).toBe(false);
        expect(verseToReader('ROM', 8, 28)).toEqual({ chapter: 8, verse: 28, differs: false });
    });

    it('Génesis sí difiere, Rut no', () => {
        expect(bookHasVersificationDifferences('GEN')).toBe(true);
        expect(bookHasVersificationDifferences('RUT')).toBe(false);
    });
});

describe('pasajes sin versículos explícitos', () => {
    it('se devuelven intactos en vez de inventar una traducción', () => {
        const capituloEntero = passage('JON', 2, null, 2, null);
        const result = passageToReader(capituloEntero);

        expect(result.passage).toEqual(capituloEntero);
        expect(result.differs).toBe(false);
    });
});

describe('invariantes de la tabla generada', () => {
    it('cada tramo abarca la misma cantidad de versículos de los dos lados', () => {
        // Si esto se rompe, el mapeo posicional deja de ser válido y el
        // módulo empezaría a devolver versículos corridos en silencio.
        for (const s of VERSIFICATION_SPANS) {
            expect(s.to - s.from).toBe(s.originalTo - s.originalFrom);
        }
    });

    it('ningún tramo se solapa con otro del mismo libro y capítulo', () => {
        const seen = new Map<string, Array<[number, number]>>();
        for (const s of VERSIFICATION_SPANS) {
            const key = `${s.book}:${s.chapter}`;
            const ranges = seen.get(key) ?? [];
            for (const [from, to] of ranges) {
                expect(s.from > to || s.to < from).toBe(true);
            }
            ranges.push([s.from, s.to]);
            seen.set(key, ranges);
        }
    });

    it('todo tramo va de menor a mayor', () => {
        for (const s of VERSIFICATION_SPANS) {
            expect(s.to).toBeGreaterThanOrEqual(s.from);
            expect(s.originalTo).toBeGreaterThanOrEqual(s.originalFrom);
        }
    });

    it('la ida y vuelta es fiel en TODOS los versículos mapeados', () => {
        // La garantía fuerte: recorre los 27 libros que difieren, versículo
        // por versículo, y verifica que traducir y volver devuelve el
        // mismo número. Un solo error de alineación en la tabla lo rompe.
        for (const s of VERSIFICATION_SPANS) {
            for (let v = s.originalFrom; v <= s.originalTo; v++) {
                const lector = verseToReader(s.book, s.originalChapter, v);
                const vuelta = verseToOriginal(s.book, lector.chapter, lector.verse);
                expect(vuelta).toEqual({ chapter: s.originalChapter, verse: v, differs: true });
            }
        }
    });

    it('cubre los 27 libros del AT que difieren, y ninguno del NT', () => {
        const libros = new Set(VERSIFICATION_SPANS.map(s => s.book));
        expect(libros.size).toBe(27);
        expect(libros.has('JON')).toBe(true);
        expect(libros.has('PSA')).toBe(true);
        expect(libros.has('MAT')).toBe(false);
    });
});
