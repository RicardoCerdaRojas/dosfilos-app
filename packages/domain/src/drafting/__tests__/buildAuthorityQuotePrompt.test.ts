import { describe, it, expect } from 'vitest';
import { buildAuthorityQuotePrompt } from '../buildAuthorityQuotePrompt';

const FUENTES = [
    { excerpt: 'La huida del profeta revela el corazón antes que los pies.', title: 'Comentario a Jonás', author: 'Calvino', page: '14' },
    { excerpt: 'Dios habla y su palabra no vuelve vacía.', title: 'Institución', author: 'Calvino' },
];

const base = { sources: FUENTES, passage: 'Jonás 1:1-2', pointTitle: 'I. Dios habla' };

describe('buildAuthorityQuotePrompt', () => {
    it('entrega los fragmentos REALES con su atribución', () => {
        const p = buildAuthorityQuotePrompt(base);
        expect(p).toContain('La huida del profeta revela el corazón');
        expect(p).toContain('Calvino, Comentario a Jonás, p. 14');
    });

    it('omite la página cuando el fragmento no la trae', () => {
        // Inventar una página es inventar la cita a medias.
        expect(buildAuthorityQuotePrompt(base)).toContain('Calvino, Institución\n');
    });

    it('es un SELECTOR: prohíbe escribir una cita nueva', () => {
        // Pedir "una cita de autoridad" sin material es el mecanismo por el que
        // se fabrica una falsa. Acá el modelo elige, no escribe.
        const p = buildAuthorityQuotePrompt(base);
        expect(p).toContain('COPIADOS PALABRA POR PALABRA');
        expect(p).toContain('No\n   escribas una cita nueva');
    });

    it('autoriza explícitamente devolver la lista vacía', () => {
        // Sin este permiso, el modelo fuerza una cita para llenar el hueco.
        const p = buildAuthorityQuotePrompt(base);
        expect(p).toContain('DEVUELVE LA LISTA VACÍA');
        expect(p).toContain('Es una respuesta\n   correcta');
    });

    it('el modelo NO escribe la atribución: devuelve el número del fragmento', () => {
        // Se le pedía escribirla dentro del texto y la omitió: llegaron citas
        // sin autor ni obra. La atribución es un dato NUESTRO, viene con el
        // fragmento recuperado — pedírsela era darle ocasión de perderla.
        const p = buildAuthorityQuotePrompt(base);
        expect(p).toContain('NO ESCRIBAS LA ATRIBUCIÓN');
        expect(p).toContain('"sourceIndex"');
    });

    it('permite recortar, no reescribir', () => {
        expect(buildAuthorityQuotePrompt(base)).toContain('RECORTAR');
        expect(buildAuthorityQuotePrompt(base)).toContain('no cambiar una sola palabra');
    });

    it('la proposición del punto orienta la selección', () => {
        const p = buildAuthorityQuotePrompt({ ...base, pointProposition: 'Dios habla con intención.' });
        expect(p).toContain('LO QUE ESTE PUNTO AFIRMA');
        expect(p).toContain('Dios habla con intención.');
    });
});
