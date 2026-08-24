import { describe, it, expect } from 'vitest';
import { needsTranslation } from '../citationLanguage';
import { buildCitationTranslationPrompt } from '../buildTranslationPrompt';

// Excerpts REALES del sermón de Jonás del fundador.
const baker =
    'From the LORD. RSV has, more literally, from the presence of the LORD. At first sight this phrase seems to imply that Jonah believed it possible to escape from God presence; by fleeing to Tarshish, he would place himself beyond the Lord jurisdiction.';
const subukjian =
    'Se trata de la verdad eterna que Dios reveló al inspirar esa porción de las Escrituras. Es la manera en que Dios trata con su pueblo, y se expresa en términos de lo que sucede ahora.';

describe('needsTranslation', () => {
    it('un lector en español necesita traducción de una cita en inglés', () => {
        expect(needsTranslation(baker, 'es')).toBe(true);
    });

    it('NO ofrece traducir lo que el lector ya lee', () => {
        // Peor que no ofrecer nada: sugiere que el sistema no entiende lo que muestra.
        expect(needsTranslation(subukjian, 'es')).toBe(false);
        expect(needsTranslation(baker, 'en')).toBe(false);
    });

    it('el caso inverso también: lector en inglés, cita en español', () => {
        expect(needsTranslation(subukjian, 'en')).toBe(true);
    });

    it('un texto corto no rinde veredicto', () => {
        // "Sic transit gloria mundi" no es inglés, ni alcanza para decidirlo.
        expect(needsTranslation('Sic transit gloria mundi', 'es')).toBe(false);
        expect(needsTranslation('The Lord is good', 'es')).toBe(false);
    });

    it('unos términos en inglés no vuelven extranjera una cita en español', () => {
        const mixta =
            'El autor sostiene que la palabra hebrea funciona como un marker discursivo, y que su uso en el texto revela la intención del narrador frente a la audiencia original del relato.';
        expect(needsTranslation(mixta, 'es')).toBe(false);
    });

    it('vacío o basura no explota', () => {
        expect(needsTranslation('', 'es')).toBe(false);
        expect(needsTranslation('   ', 'es')).toBe(false);
    });
});

describe('buildCitationTranslationPrompt — traducir no es parafrasear', () => {
    it('prohíbe la paráfrasis explícitamente', () => {
        const p = buildCitationTranslationPrompt(baker, 'es');
        expect(p).toContain('TRADUCE, NO PARAFRASEES');
        expect(p).toContain('No\n   resumas, no expliques, no agregues nada');
    });

    it('permite rendirse en vez de inventar', () => {
        // Misma lección que la cita de autoridad obligatoria: exigir un
        // resultado siempre es el mecanismo por el que se fabrica uno falso.
        const p = buildCitationTranslationPrompt(baker, 'es');
        expect(p).toContain('devuelve el texto original sin');
        expect(p).toContain('peor que');
    });

    it('protege lo que no se traduce: nombres, referencias y lenguas originales', () => {
        const p = buildCitationTranslationPrompt(baker, 'es');
        expect(p).toContain('hebreo, griego, latín');
        expect(p).toContain('referencias bíblicas');
    });

    it('respeta el corte del excerpt en vez de completarlo', () => {
        // El excerpt son 280 caracteres del chunk: casi siempre viene cortado.
        expect(buildCitationTranslationPrompt(baker, 'es')).toContain('No la completes');
    });

    it('el idioma destino viaja en el prompt', () => {
        expect(buildCitationTranslationPrompt(baker, 'es')).toContain('al español');
        expect(buildCitationTranslationPrompt(subukjian, 'en')).toContain('al inglés');
    });
});
