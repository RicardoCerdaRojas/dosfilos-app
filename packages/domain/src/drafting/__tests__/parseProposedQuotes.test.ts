import { describe, it, expect } from 'vitest';
import { parseProposedQuotes } from '../parseProposedQuotes';

const FUENTES = [
    {
        excerpt: 'Es un Dios que puede ser conocido porque es un Dios que habla. La Escritura lo presenta como el modelo de toda comunicación.',
        title: 'Teología de la Palabra',
        author: 'Frame',
        page: '31',
    },
    { excerpt: 'Dios declaró su verdadera Palabra en coherencia con su verdadera naturaleza.', title: 'Institución', author: 'Calvino' },
];

const salida = (elements: unknown) => JSON.stringify({ elements });

describe('parseProposedQuotes', () => {
    it('pone la atribución DESDE NUESTROS DATOS, no desde el modelo', () => {
        // Se le pedía escribirla dentro del texto y la omitió: llegaron citas
        // sin autor ni obra, que en un sermón son peores que ninguna cita.
        const [q] = parseProposedQuotes(
            salida([{ sourceIndex: 1, text: 'Es un Dios que puede ser conocido porque es un Dios que habla.', why: 'x' }]),
            FUENTES,
        );
        expect(q.text).toBe('"Es un Dios que puede ser conocido porque es un Dios que habla." — Frame, Teología de la Palabra, p. 31');
    });

    it('omite la página cuando el fragmento no la trae, sin inventarla', () => {
        const [q] = parseProposedQuotes(
            salida([{ sourceIndex: 2, text: 'Dios declaró su verdadera Palabra', why: 'x' }]),
            FUENTES,
        );
        expect(q.text).toContain('— Calvino, Institución');
        expect(q.text).not.toContain('p.');
    });

    it('DESCARTA una cita cuyo texto no está en el fragmento que dice citar', () => {
        // La garantía que convierte "le pedimos que copie" en "comprobamos que
        // copió". Mostrar una cita alterada con atribución real es el daño
        // exacto que este flujo evita.
        expect(
            parseProposedQuotes(
                salida([{ sourceIndex: 1, text: 'Dios habla siempre a todos por igual.', why: 'x' }]),
                FUENTES,
            ),
        ).toEqual([]);
    });

    it('acepta el recorte con […] que el prompt autoriza', () => {
        const [q] = parseProposedQuotes(
            salida([{ sourceIndex: 1, text: 'Es un Dios que puede ser conocido […] modelo de toda comunicación.', why: 'x' }]),
            FUENTES,
        );
        expect(q).toBeDefined();
    });

    it('tolera comillas tipográficas y espacios distintos', () => {
        const [q] = parseProposedQuotes(
            salida([{ sourceIndex: 2, text: '“Dios  declaró su verdadera Palabra”', why: 'x' }]),
            FUENTES,
        );
        expect(q).toBeDefined();
    });

    it('descarta un índice que no existe en vez de atribuir al azar', () => {
        expect(parseProposedQuotes(salida([{ sourceIndex: 9, text: 'lo que sea', why: 'x' }]), FUENTES)).toEqual([]);
        expect(parseProposedQuotes(salida([{ text: 'sin índice', why: 'x' }]), FUENTES)).toEqual([]);
    });

    it('devuelve lista vacía con basura, sin lanzar', () => {
        expect(parseProposedQuotes('no soy json', FUENTES)).toEqual([]);
        expect(parseProposedQuotes(salida('no es lista'), FUENTES)).toEqual([]);
    });
});
