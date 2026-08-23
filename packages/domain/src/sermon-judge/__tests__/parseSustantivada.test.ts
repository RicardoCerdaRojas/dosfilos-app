import { describe, it, expect } from 'vitest';
import { parseSustantivada } from '../parseSustantivada';

/**
 * Casos tomados de proposiciones REALES del fundador en producción.
 * El parser es el puente entre la frase que existe en un sermón y los 8
 * elementos que `confrontProposition` sabe juzgar.
 */

describe('parseSustantivada — proposiciones reales del corpus', () => {
    it('2 Pedro 1:16-21 — pasaje, numeral y sustantivo', () => {
        const { draft } = parseSustantivada(
            'En 2 Pedro 1:16-21, veremos tres verdades sobre la autoridad de las Escrituras que deben modelar nuestra confianza en Dios.',
        );
        expect(draft.pasaje).toBe('2 Pedro 1:16-21');
        expect(draft.cantidadDePuntos).toBe(3);
        expect(draft.sustantivo).toBe('verdades');
    });

    it('1 Pedro 5:1-4 — sustantivo distinto (exhortaciones)', () => {
        const { draft } = parseSustantivada('En 1 Pedro 5:1-4, veremos tres exhortaciones a los pastores que nos permitirán servir fielmente a Dios.');
        expect(draft.sustantivo).toBe('exhortaciones');
        expect(draft.cantidadDePuntos).toBe(3);
    });

    it('1 Corintios 15:20-26 — nexo "por las que"', () => {
        const { draft } = parseSustantivada('En 1 Corintios 15:20-26, veremos tres verdades por las que un creyente no debe temer a la muerte.');
        expect(draft.elementoProposicional).toBe('por las que');
        expect(draft.ideaCentral).toContain('no debe temer a la muerte');
    });

    it('Proverbios 13:12 — otro verbo (aprenderemos)', () => {
        const { draft, verbo } = parseSustantivada('En Proverbios 13:12, aprenderemos tres verdades que nos libran de la frustración.');
        expect(verbo).toBe('aprenderemos');
        expect(draft.cantidadDePuntos).toBe(3);
    });

    it('Jonás 1:1-3 — la que generó la app tras el arreglo', () => {
        const { draft } = parseSustantivada(
            'En Jonás 1:1-3, aprenderemos tres lecciones que debemos abrazar para que confiemos en la gracia inquebrantable de Dios, incluso en nuestra propia rebeldía.',
        );
        expect(draft.pasaje).toBe('Jonás 1:1-3');
        expect(draft.cantidadDePuntos).toBe(3);
        expect(draft.sustantivo).toBe('lecciones');
    });

    it('tolera el markdown y los emojis que la UI mete alrededor del pasaje', () => {
        const { draft } = parseSustantivada('En 📖 **1 Pedro 3:1-7**, descubriremos tres verdades que debemos abrazar.');
        expect(draft.pasaje).toBe('1 Pedro 3:1-7');
        expect(draft.cantidadDePuntos).toBe(3);
    });

    it('los puntos entran aparte: son la otra mitad del contrato', () => {
        const { draft } = parseSustantivada('En Juan 1:1, veremos dos verdades.', ['I. Uno', 'II. Dos']);
        expect(draft.puntos).toEqual(['I. Uno', 'II. Dos']);
    });
});

describe('parseSustantivada — lo que NO reconoce', () => {
    it('una proposición libre rinde pocos elementos, y eso es correcto', () => {
        // Es la que generaba la app antes del arreglo. No es un error del
        // parser: es que la frase no tiene esos elementos.
        const { draft } = parseSustantivada(
            'Ante la persistente gracia de Dios que nos persigue, somos exhortados a confrontar nuestra resistencia.',
        );
        expect(draft.pasaje).toBeUndefined();
        expect(draft.cantidadDePuntos).toBeUndefined();
        expect(draft.sustantivo).toBeUndefined();
    });

    it('detecta el verbo en 2ª singular en vez de reportar que falta', () => {
        // Distinguir "no hay verbo" de "el verbo está en la persona
        // equivocada" es lo que permite decirle al pastor qué corregir.
        const r = parseSustantivada('En Filipenses 2:5-11, descubrirás tres verdades sobre la humillación de Cristo.');
        expect(r.verboEnSegundaPersona).toBe(true);
        expect(r.verbo).toBe('descubrirás');
        expect(r.draft.cantidadDePuntos).toBe(3);
    });

    it('texto vacío no revienta ni inventa', () => {
        expect(parseSustantivada('').draft).toEqual({});
    });

    it('nunca adivina: sin numeral reconocible, la cantidad queda ausente', () => {
        const { draft } = parseSustantivada('En Juan 3:16, veremos muchas verdades que nos alientan.');
        expect(draft.cantidadDePuntos).toBeUndefined();
    });
});
