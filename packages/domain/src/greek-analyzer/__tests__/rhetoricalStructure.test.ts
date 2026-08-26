import { describe, it, expect } from 'vitest';
import { validateRhetoricalStructure } from '../rhetoricalStructure';

/** El quiasmo real de Santiago 1:1 que vio el profesor del fundador. */
const santiago11 = {
    type: 'chiasm',
    note: 'El marco son los dos nominativos en aposición; el centro, los dos genitivos.',
    elements: [
        { label: 'A', wordIndices: [0], note: 'Ἰάκωβος — el remitente' },
        { label: 'B', wordIndices: [1], note: 'θεοῦ — Dios' },
        { label: "B'", wordIndices: [3, 4, 5], note: 'κυρίου Ἰησοῦ Χριστοῦ' },
        { label: "A'", wordIndices: [6], note: 'δοῦλος — en aposición a Ἰάκωβος' },
    ],
};

describe('validateRhetoricalStructure — desconfiado por diseño', () => {
    it('acepta el quiasmo de Santiago 1:1: los pares se abren y se cierran invertidos', () => {
        const out = validateRhetoricalStructure(santiago11, 15);
        expect(out?.type).toBe('chiasm');
        expect(out?.elements).toHaveLength(4);
    });

    it('RECHAZA llamar quiasmo a un paralelismo (A B A B’ no invierte)', () => {
        // El abuso típico: el modelo etiqueta "quiasmo" una estructura que no
        // se cierra en espejo. La simetría se verifica en código.
        const paralelo = {
            ...santiago11,
            elements: [
                { label: 'A', wordIndices: [0], note: 'x' },
                { label: 'B', wordIndices: [1], note: 'x' },
                { label: "A'", wordIndices: [3], note: 'x' },
                { label: "B'", wordIndices: [6], note: 'x' },
            ],
        };
        expect(validateRhetoricalStructure(paralelo, 15)).toBeNull();
    });

    it('rechaza un quiasmo de un solo par — eso es una inclusión, no un quiasmo', () => {
        const unPar = {
            ...santiago11,
            elements: [
                { label: 'A', wordIndices: [0], note: 'x' },
                { label: "A'", wordIndices: [6], note: 'x' },
            ],
        };
        expect(validateRhetoricalStructure(unPar, 15)).toBeNull();
    });

    it('rechaza miembros sin palabras reales — prosa disfrazada de estructura', () => {
        const sinIndices = {
            ...santiago11,
            elements: santiago11.elements.map((e) => ({ ...e, wordIndices: [] })),
        };
        expect(validateRhetoricalStructure(sinIndices, 15)).toBeNull();
    });

    it('rechaza índices fuera del versículo y rótulos sin pareja', () => {
        expect(
            validateRhetoricalStructure({ ...santiago11, elements: [{ label: 'A', wordIndices: [99], note: 'x' }] }, 15),
        ).toBeNull();
        const impar = { ...santiago11, elements: [...santiago11.elements, { label: 'C', wordIndices: [8], note: 'x' }] };
        expect(validateRhetoricalStructure(impar, 15)).toBeNull();
    });

    it('rechaza tipos inventados', () => {
        expect(validateRhetoricalStructure({ ...santiago11, type: 'estructuraConcentrica' }, 15)).toBeNull();
    });

    it('la inclusión con UN par es válida', () => {
        const inclusio = {
            type: 'inclusio',
            note: 'Abre y cierra con la misma idea.',
            elements: [
                { label: 'A', wordIndices: [0], note: 'apertura' },
                { label: "A'", wordIndices: [14], note: 'cierre' },
            ],
        };
        expect(validateRhetoricalStructure(inclusio, 15)?.type).toBe('inclusio');
    });
});
