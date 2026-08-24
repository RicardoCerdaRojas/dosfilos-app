import { describe, it, expect } from 'vitest';
import { classifyContribution } from '../classifyContribution';

describe('classifyContribution', () => {
    describe('lo que el fundador escribió de verdad (2026-08-24)', () => {
        it.each(['Autor', 'Fecha del libro', 'Período histórico con años', 'Quién es el autor', 'Cuando se escribio el libro', 'En que contexto historico estan (con fechas)'])(
            '"%s" es directiva',
            (t) => expect(classifyContribution(t)).toBe('directiva'),
        );
    });

    describe('lo que el modelo propuso, que sí son ideas', () => {
        it.each([
            'Nínive era la capital de Asiria, el imperio cruel y brutal que representaba una amenaza constante para Israel.',
            "La descripción de Nínive como 'gran ciudad' no solo aludía a su tamaño físico, sino a su inmenso poder militar.",
            'Jope era el principal puerto israelita hacia occidente, y Tarsis el confín del mundo conocido.',
        ])('es elemento: %s', (t) => expect(classifyContribution(t)).toBe('elemento'));
    });

    it('una exhortación al motor es directiva', () => {
        // El caso que el fundador pidió explícitamente en el ADR.
        expect(classifyContribution('Citemos el versículo donde Jeremías dice que la palabra es como martillo')).toBe('directiva');
    });

    it('una pregunta es directiva aunque lleve verbo', () => {
        expect(classifyContribution('¿Por qué Jonás huye a Tarsis?')).toBe('directiva');
    });

    describe('EL SESGO: ante la duda, la idea es del pastor', () => {
        it('frase larga sin verbo del catálogo sale elemento, no directiva', () => {
            // El catálogo de verbos es finito y el idioma no. Quitarle una idea
            // suya rompe la confianza en el indicador; regalarle una, no.
            expect(
                classifyContribution(
                    'La huida de Jonás como gesto deliberado de insubordinación profética frente al llamado divino recibido',
                ),
            ).toBe('elemento');
        });

        it('texto vacío no se marca como directiva', () => {
            expect(classifyContribution('   ')).toBe('elemento');
        });
    });

    it('un tema corto sin verbo es directiva', () => {
        expect(classifyContribution('Trasfondo asirio')).toBe('directiva');
        expect(classifyContribution('Geografía del Mediterráneo')).toBe('directiva');
    });
});
