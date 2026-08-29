import { describe, it, expect } from 'vitest';

import {
    foldForSearch,
    matchRanges,
    matchesQuery,
    splitByMatches,
} from '../searchMatching';

describe('foldForSearch', () => {
    it('quita acentos y baja a minúsculas', () => {
        expect(foldForSearch('Nínive')).toBe('ninive');
    });

    it('CONSERVA EL LARGO: es lo que permite resaltar sobre el original', () => {
        const text = 'Jehová está aquí, según Jonás';
        expect(foldForSearch(text)).toHaveLength(text.length);
    });
});

describe('matchRanges', () => {
    it('encuentra la palabra sin acento en el texto acentuado', () => {
        const text = 'y ve a Nínive, aquella gran ciudad';
        const ranges = matchRanges(text, 'ninive');
        expect(ranges).toHaveLength(1);
        expect(text.slice(ranges[0].start, ranges[0].end)).toBe('Nínive');
    });

    it('exige TODOS los términos, no cualquiera', () => {
        const text = 'Vino palabra de Jehová a Jonás';
        expect(matchesQuery(text, 'jonas jehova')).toBe(true);
        expect(matchesQuery(text, 'jonas ninive')).toBe(false);
    });

    it('encuentra cada aparición del mismo término', () => {
        expect(matchRanges('mar y mar', 'mar')).toHaveLength(2);
    });

    it('funde rangos que se solapan para no pintar dos veces', () => {
        // 'gran' y 'grande' se pisan sobre la misma palabra.
        const ranges = matchRanges('una tempestad grande', 'gran grande');
        expect(ranges).toHaveLength(1);
    });

    it('una consulta vacía no coincide con nada', () => {
        expect(matchRanges('lo que sea', '   ')).toEqual([]);
    });
});

describe('splitByMatches', () => {
    it('parte el texto conservándolo entero', () => {
        const text = 'y ve a Nínive';
        const parts = splitByMatches(text, matchRanges(text, 'ninive'));
        expect(parts.map((p) => p.text).join('')).toBe(text);
        expect(parts.filter((p) => p.match).map((p) => p.text)).toEqual(['Nínive']);
    });
});
