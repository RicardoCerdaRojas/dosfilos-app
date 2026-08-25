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
        // Título → VERSÍCULO → proposición y desarrollo → apoyo → imagen →
        // aplicación → transición. El pastor lee el pasaje antes de oír qué se
        // afirma de él, y la cita respalda antes de que la imagen lo haga
        // visible.
        expect(sermonPointBlocks({ ...PUNTO, mainPassageRef: 'Jonás 1:1-2', authorityQuote: 'Owen dijo…' }).map((b) => b.kind)).toEqual([
            'mainPassage',
            'content',
            'crossReferences',
            'authorityQuote',
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

    it('la cita de autoridad aparece SÓLO si existe, y con rótulo propio', () => {
        // Antes se colaba como un bloque de contenido más, sin decir qué era.
        expect(sermonPointBlocks(PUNTO).some((b) => b.kind === 'authorityQuote')).toBe(false);
        const conCita = sermonPointBlocks({ ...PUNTO, authorityQuote: 'Owen dijo algo verificable.' });
        const cita = conCita.find((b) => b.kind === 'authorityQuote');
        expect(cita?.headingKey).toBe('drafting.pointBlocks.authorityQuote');
    });

    it('sin pasaje del punto no inventa un bloque de texto', () => {
        expect(sermonPointBlocks(PUNTO).some((b) => b.kind === 'mainPassage')).toBe(false);
    });

    it('una transición en blanco no genera bloque', () => {
        expect(sermonPointBlocks({ ...PUNTO, transition: '   ' }).some((b) => b.kind === 'transition')).toBe(false);
    });
});
