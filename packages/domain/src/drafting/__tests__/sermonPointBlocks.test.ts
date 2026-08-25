import { describe, it, expect } from 'vitest';
import { sermonPointBlocks } from '../sermonPointBlocks';

const PUNTO = {
    content: 'La formulación muestra un mandato directo.',
    scriptureReferences: ['> Jonás 1:1-2', 'Salmo 139:7-12'],
    illustration: 'Imagina un jefe de obras.',
    implications: ['Vive consciente de su dirección.'],
    authorityQuote: null,
    transition: 'Y si Dios habla así, ¿qué hace el hombre?',
};

describe('sermonPointBlocks', () => {
    it('define el orden en que se predica un punto', () => {
        expect(sermonPointBlocks(PUNTO).map((b) => b.kind)).toEqual([
            'content',
            'crossReferences',
            'illustration',
            'implications',
            'transition',
        ]);
    });

    it('el cuerpo NO lleva rótulo: es lo que se predica, no una ficha', () => {
        expect(sermonPointBlocks(PUNTO)[0].headingKey).toBeUndefined();
    });

    it('devuelve CLAVES i18n, no texto', () => {
        // Los rótulos vivían hardcodeados en español dentro del componente.
        const claves = sermonPointBlocks(PUNTO).map((b) => b.headingKey).filter(Boolean);
        expect(claves.every((k) => k!.startsWith('drafting.pointBlocks.'))).toBe(true);
    });

    it('limpia el "> " de cita que traen las referencias generadas', () => {
        const refs = sermonPointBlocks(PUNTO).find((b) => b.kind === 'crossReferences');
        expect(refs?.items).toEqual(['Jonás 1:1-2', 'Salmo 139:7-12']);
    });

    it('un bloque vacío NO se devuelve: un rótulo sobre nada anuncia lo que no está', () => {
        const bloques = sermonPointBlocks({ content: 'sólo cuerpo' });
        expect(bloques.map((b) => b.kind)).toEqual(['content']);
    });

    it('la cita de autoridad aparece SÓLO si existe', () => {
        expect(sermonPointBlocks(PUNTO).filter((b) => b.kind === 'content')).toHaveLength(1);
        const conCita = sermonPointBlocks({ ...PUNTO, authorityQuote: 'Owen dijo algo verificable.' });
        expect(conCita.filter((b) => b.kind === 'content')).toHaveLength(2);
    });

    it('una transición en blanco no genera bloque', () => {
        expect(sermonPointBlocks({ ...PUNTO, transition: '   ' }).some((b) => b.kind === 'transition')).toBe(false);
    });
});
