import { describe, it, expect } from 'vitest';
import { opensBook } from '../canon/opensBook';

describe('opensBook', () => {
    it('reconoce la apertura del libro', () => {
        expect(opensBook('Jonás 1:1-3')).toBe(true);
        expect(opensBook('Juan 1:1')).toBe(true);
        expect(opensBook('Jonás 1')).toBe(true);      // capítulo entero
        expect(opensBook('1 Juan 1:1-4')).toBe(true); // libro numerado
    });

    it('NO se activa en medio del libro', () => {
        expect(opensBook('Jonás 1:2-3')).toBe(false);
        expect(opensBook('Jonás 3:1-5')).toBe(false);
        expect(opensBook('Romanos 8:1')).toBe(false);
        expect(opensBook('Juan 1:14')).toBe(false);
    });

    it('ante una referencia ilegible responde false', () => {
        // Un falso positivo hace que un sermón de la mitad del libro arranque
        // presentándolo desde cero; un falso negativo sólo omite un párrafo.
        expect(opensBook('')).toBe(false);
        expect(opensBook('no es una referencia')).toBe(false);
        expect(opensBook('Libro Inventado 1:1')).toBe(false);
    });
});
