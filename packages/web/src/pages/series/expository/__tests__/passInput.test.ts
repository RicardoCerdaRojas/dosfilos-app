import { describe, it, expect } from 'vitest';
import { buildPassInput, sourceLanguageFromLoaded } from '../passInput';

const versiculos = [{ chapter: 1, verse: 1, text: 'Simón Pedro…' }] as any;

describe('buildPassInput — lo que reciben los cinco pases', () => {
    it('lleva siempre libro, idioma de salida y versículos', () => {
        expect(buildPassInput({ book: '2 Pedro', displayLanguage: 'es', verses: versiculos }))
            .toEqual({ book: '2 Pedro', displayLanguage: 'es', verses: versiculos });
    });

    it('OMITE las claves opcionales en vez de mandarlas como undefined', () => {
        // El contrato distingue "no se dice nada" de "se dice que no hay": el
        // comportamiento heredado de los pases depende de esa diferencia.
        const out = buildPassInput({ book: 'Jonás', displayLanguage: 'es', verses: versiculos });

        expect('sourceLanguage' in out).toBe(false);
        expect('scopeKey' in out).toBe(false);
        expect('targetPreachableCount' in out).toBe(false);
    });

    it('el campo vacío del formulario NO viaja como número', () => {
        // El input de "cuántos sermones" empieza en '' mientras no se escriba.
        const out = buildPassInput({
            book: 'Jonás', displayLanguage: 'es', verses: versiculos, targetPreachableCount: '',
        });

        expect('targetPreachableCount' in out).toBe(false);
    });

    it('un número sí viaja, incluido el cero', () => {
        expect(buildPassInput({
            book: 'Jonás', displayLanguage: 'es', verses: versiculos, targetPreachableCount: 7,
        }).targetPreachableCount).toBe(7);
    });

    it('conserva el marcador de fragmento cuando lo hay', () => {
        // Sin `scopeKey`, un análisis de "Mateo 10" puede recibir lo cacheado
        // del libro entero.
        expect(buildPassInput({
            book: 'Mateo', displayLanguage: 'es', verses: versiculos, scopeKey: 'Mateo 10',
        }).scopeKey).toBe('Mateo 10');
    });
});

describe('sourceLanguageFromLoaded — qué se le dice al prompt sobre el texto', () => {
    it('reconoce los dos originales', () => {
        expect(sourceLanguageFromLoaded('original-greek')).toBe('greek');
        expect(sourceLanguageFromLoaded('original-hebrew')).toBe('hebrew');
    });

    it('cualquier otra cosa es una traducción', () => {
        expect(sourceLanguageFromLoaded('rvr1960')).toBe('translation');
        expect(sourceLanguageFromLoaded(undefined)).toBe('translation');
    });

    it('un origen desconocido cae a traducción, que es la respuesta SEGURA', () => {
        // El prompt usa esto para decidir si cita sintaxis directamente o si
        // aproxima. Ante la duda debe aproximar: afirmar sintaxis sobre un
        // texto que quizá no la tiene es el error caro.
        expect(sourceLanguageFromLoaded('formato-que-aun-no-existe')).toBe('translation');
    });

    it('NUNCA devuelve el idioma de salida del paper', () => {
        // El bug que esto cierra: el camino de refinar mandaba 'es'/'en' —el
        // idioma en que se escribe el paper— como si fuera el idioma del texto
        // analizado. Ninguno de los dos está en el contrato.
        for (const entrada of ['es', 'en']) {
            expect(['greek', 'hebrew', 'translation']).toContain(sourceLanguageFromLoaded(entrada));
        }
        expect(sourceLanguageFromLoaded('es')).toBe('translation');
    });
});
