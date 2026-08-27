import { describe, it, expect } from 'vitest';
import { parseBibleReferenceParts } from '../parseBibleReferenceParts';
import { BIBLE_BOOKS_ES, resolveBibleBook } from '../bibleBookTable';

describe('resolveBibleBook — las abreviaturas que faltaban en una copia', () => {
    it('reconoce las abreviaturas acentuadas comunes', () => {
        // Éstas existían SÓLO en la copia del asistente: en la página de Biblia
        // "Éx 3" no resolvía y el pastor no recibía ningún error, sólo nada.
        expect(resolveBibleBook('Gén')?.id).toBe('gn');
        expect(resolveBibleBook('Éx')?.id).toBe('ex');
        expect(resolveBibleBook('Núm')?.id).toBe('nm');
    });

    it('ignora tildes y mayúsculas al buscar', () => {
        expect(resolveBibleBook('filemon')?.key).toBe('Filemón');
        expect(resolveBibleBook('FILEMÓN')?.key).toBe('Filemón');
    });

    it('devuelve la forma acentuada canónica, no lo que se escribió', () => {
        // El pastor escribe rápido; se le muestra bien escrito.
        expect(resolveBibleBook('genesis')?.key).toBe('Génesis');
    });

    it('un libro inexistente no resuelve', () => {
        expect(resolveBibleBook('Melquisedec')).toBeNull();
    });
});

describe('parseBibleReferenceParts — el número suelto se lee según el libro', () => {
    it('"Romanos 1" es el capítulo entero', () => {
        expect(parseBibleReferenceParts('Romanos 1')).toMatchObject({
            bookId: 'rm', chapter: 1, verseStart: 0,
        });
    });

    it('"Filemón 8" es el VERSÍCULO 8 — Filemón tiene un solo capítulo', () => {
        // Sin esta distinción la referencia apunta a un capítulo que no existe
        // y el pasaje sale vacío sin decir por qué.
        expect(parseBibleReferenceParts('Filemón 8')).toMatchObject({
            bookId: 'phm', chapter: 1, verseStart: 8,
        });
    });

    it('"Filemón 8-21" es un rango de versículos', () => {
        expect(parseBibleReferenceParts('Filemón 8-21')).toMatchObject({
            chapter: 1, verseStart: 8, verseEnd: 21,
        });
    });

    it('capítulo:versículo y su rango', () => {
        expect(parseBibleReferenceParts('Juan 3:16')).toMatchObject({
            bookId: 'jo', chapter: 3, verseStart: 16,
        });
        expect(parseBibleReferenceParts('Juan 3:16-17')).toMatchObject({
            chapter: 3, verseStart: 16, verseEnd: 17,
        });
    });

    it('sólo el libro abre en el capítulo 1', () => {
        expect(parseBibleReferenceParts('Santiago')).toMatchObject({
            bookId: 'jm', chapter: 1, verseStart: 0,
        });
    });

    it('devuelve las DOS formas del libro', () => {
        // Cada superficie usa una: la clave se muestra, el id lee los datos.
        expect(parseBibleReferenceParts('filemon 8')).toMatchObject({
            bookKey: 'Filemón', bookId: 'phm',
        });
    });

    it('rechaza los rangos de capítulos en vez de entenderlos a medias', () => {
        // Preferible no entender que entender mal: aceptarlo a medias
        // devolvería una referencia que dice algo distinto de lo escrito.
        expect(parseBibleReferenceParts('Romanos 1-3')).toBeNull();
        expect(parseBibleReferenceParts('Juan 3-4:1')).toBeNull();
    });

    it('acepta el punto como separador', () => {
        expect(parseBibleReferenceParts('Juan 3.16')).toMatchObject({ chapter: 3, verseStart: 16 });
    });

    it('basura no resuelve', () => {
        expect(parseBibleReferenceParts('')).toBeNull();
        expect(parseBibleReferenceParts('3:16')).toBeNull();
    });
});

describe('la tabla', () => {
    it('toda clave apunta a un id no vacío', () => {
        for (const [key, id] of Object.entries(BIBLE_BOOKS_ES)) {
            expect(id, `${key} sin id`).toBeTruthy();
        }
    });

    it('cubre los 66 libros', () => {
        expect(new Set(Object.values(BIBLE_BOOKS_ES)).size).toBe(66);
    });
});
