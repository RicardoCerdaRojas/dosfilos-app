import { describe, it, expect } from 'vitest';
import { syncSyntacticUnit } from '../syncSyntacticUnit';
import type { SyntacticUnit } from '@dosfilos/domain';

const unidadDeJonas = (): SyntacticUnit => ({
    book: 'Jonás',
    chapterStart: 2,
    verseStart: 1,
    chapterEnd: 2,
    verseEnd: 10,
    originalLanguage: 'hebrew',
    justification: 'El salmo forma una unidad con el pez que lo enmarca.',
});

describe('syncSyntacticUnit', () => {
    it('traduce lo que el pastor escribe a coordenadas del original', () => {
        // Escribe «Jonás 1:17-2:10» leyendo su RVR; se guarda como el
        // 2:1-11 del Masorético, que es lo que el analizador va a buscar.
        const resultado = syncSyntacticUnit(unidadDeJonas(), 'Jonás 1:17-2:10');

        expect(resultado).toMatchObject({
            chapterStart: 2, verseStart: 1,
            chapterEnd: 2, verseEnd: 11,
        });
    });

    it('conserva el idioma y la justificación al recalcular las fronteras', () => {
        // La razón del corte no depende de dónde caen sus bordes, y perderla
        // dejaría al paper sin encuadre — que es el bug que ya costó seis
        // papers generados con framing neutro.
        const resultado = syncSyntacticUnit(unidadDeJonas(), 'Jonás 1:17-2:10');

        expect(resultado?.originalLanguage).toBe('hebrew');
        expect(resultado?.justification).toBe('El salmo forma una unidad con el pez que lo enmarca.');
        expect(resultado?.book).toBe('Jonás');
    });

    it('no toca nada cuando el texto no es una referencia interpretable', () => {
        // «Jonás 2 (segunda mitad)» es una etiqueta legítima. Perder las
        // fronteras por no saber leerla sería peor que no actualizarlas.
        const original = unidadDeJonas();
        expect(syncSyntacticUnit(original, 'Jonás 2 (segunda mitad)')).toEqual(original);
        expect(syncSyntacticUnit(original, 'El salmo del pez')).toEqual(original);
        expect(syncSyntacticUnit(original, '')).toEqual(original);
    });

    it('deja la unidad intacta cuando el pasaje no trae versículos', () => {
        // Un capítulo entero no tiene traducción de un solo tramo entre
        // versificaciones; se prefiere no tocar antes que inventar.
        const original = unidadDeJonas();
        expect(syncSyntacticUnit(original, 'Jonás 2')).toEqual(original);
    });

    it('funciona sin unidad previa, tomando el libro del texto', () => {
        const resultado = syncSyntacticUnit(undefined, 'Jonás 1:17-2:10');

        expect(resultado).toMatchObject({
            book: 'Jonás',
            chapterStart: 2, verseStart: 1,
            chapterEnd: 2, verseEnd: 11,
        });
    });

    it('en libros sin divergencia guarda los mismos números que se escribieron', () => {
        const resultado = syncSyntacticUnit(undefined, 'Romanos 8:28-30');

        expect(resultado).toMatchObject({
            chapterStart: 8, verseStart: 28,
            chapterEnd: 8, verseEnd: 30,
        });
    });
});
