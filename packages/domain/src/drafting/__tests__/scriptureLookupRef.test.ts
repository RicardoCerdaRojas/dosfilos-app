import { describe, it, expect } from 'vitest';
import { scriptureLookupRef } from '../scriptureLookupRef';

describe('scriptureLookupRef', () => {
    it('quita el sufijo de mitad de versículo, que el parser bíblico rechaza', () => {
        // Caso real: el punto 1 mostraba su texto y el punto 2 no, porque su
        // referencia era "Jonás 1:3a".
        expect(scriptureLookupRef('Jonás 1:3a')).toBe('Jonás 1:3');
        expect(scriptureLookupRef('Jonás 1:3b')).toBe('Jonás 1:3');
    });

    it('deja intacta una referencia normal', () => {
        expect(scriptureLookupRef('Jonás 1:1-2')).toBe('Jonás 1:1-2');
        expect(scriptureLookupRef('Salmo 139:7-12')).toBe('Salmo 139:7-12');
    });

    it('no toca el número del libro ni el capítulo', () => {
        expect(scriptureLookupRef('1 Corintios 13:4a')).toBe('1 Corintios 13:4');
        expect(scriptureLookupRef('2 Reyes 14:25')).toBe('2 Reyes 14:25');
    });

    it('maneja rangos con mitades en los dos extremos', () => {
        expect(scriptureLookupRef('Jonás 1:3a-4b')).toBe('Jonás 1:3-4');
    });

    it('vacío o ausente no produce una referencia falsa', () => {
        expect(scriptureLookupRef(undefined)).toBeUndefined();
        expect(scriptureLookupRef('   ')).toBeUndefined();
    });
});
