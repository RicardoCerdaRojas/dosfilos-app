import { describe, it, expect } from 'vitest';
import { studyFromExegesis, studyKeyWordsFromExegesis } from '../workshopStudyProps';

describe('studyKeyWordsFromExegesis', () => {
    it('arma la forma compartida con el generador', () => {
        // DOS CAMINOS, UNA FORMA: si esto cambia, el sermón armado en el taller
        // deja de parecerse al generado desde el mismo estudio.
        const salida = studyKeyWordsFromExegesis({
            keyWords: [{ original: 'ὑπομονή', transliteration: 'hypomoné', significance: 'aguante bajo carga' }],
        });
        expect(salida).toEqual(['*ὑπομονή* (hypomoné) — aguante bajo carga']);
    });

    it('omite las partes que faltan, sin dejar huecos', () => {
        expect(studyKeyWordsFromExegesis({ keyWords: [{ original: 'πειρασμός' }] })).toEqual(['*πειρασμός*']);
        expect(studyKeyWordsFromExegesis({ keyWords: [{ original: 'χαρά', significance: 'gozo' }] })).toEqual([
            '*χαρά* — gozo',
        ]);
    });

    it('descarta la palabra que no aporta nada', () => {
        expect(studyKeyWordsFromExegesis({ keyWords: [{}] })).toEqual([]);
    });

    it('sin estudio no inventa una lista', () => {
        expect(studyKeyWordsFromExegesis(undefined)).toEqual([]);
        expect(studyKeyWordsFromExegesis({})).toEqual([]);
    });
});

describe('studyFromExegesis', () => {
    it('sin estudio devuelve undefined, no un objeto vacío', () => {
        // El taller distingue "no hay estudio" de "hay uno sin contexto".
        expect(studyFromExegesis(null)).toBeUndefined();
    });

    it('tolera una exégesis sin bloque de contexto', () => {
        expect(studyFromExegesis({ exegeticalProposition: 'Dios completa la obra' })).toEqual({
            exegeticalProposition: 'Dios completa la obra',
            historical: undefined,
            literary: undefined,
            audience: undefined,
            pastoralInsights: undefined,
        });
    });
});
