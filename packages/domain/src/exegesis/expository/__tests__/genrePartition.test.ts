import { describe, it, expect } from 'vitest';
import {
    SELECTABLE_GENRES,
    SENTINEL_GENRES,
    PENDING_AUTHOR_GENRES,
    isSelectableGenre,
    isSentinelGenre,
} from '../BookPanorama';

/**
 * Redacción v2 §11.0 / 0b-A S1 — la partición sellada del enum `LiteraryGenre`
 * es SSOT único. Este test rompe CI ante drift: si se agrega un valor al enum
 * sin categorizarlo (selectable / sentinel / pending), la unión deja de cubrir
 * el enum y falla — no queda hueco silencioso.
 *
 * Espejo runtime legible del enum (mismo patrón independiente que los tests de
 * catálogo de 0a): la garantía DURA de "keys ≡ enum" la dan los `Record<
 * LiteraryGenre,…>` tipados; esto asegura que la PARTICIÓN cubre esas keys.
 */
const ALL_GENRES = ['epistle', 'narrative', 'parable', 'poetry', 'prophecy', 'wisdom', 'gospel', 'apocalypse', 'law', 'mixed'];

describe('partición de género (SELECTABLE / SENTINEL / PENDING_AUTHOR)', () => {
    it('las tres clases son mutuamente exclusivas (sin solapamiento)', () => {
        const selectable = new Set<string>(SELECTABLE_GENRES);
        const sentinel = new Set<string>(SENTINEL_GENRES);
        const pending = new Set<string>(PENDING_AUTHOR_GENRES);

        for (const g of selectable) {
            expect(sentinel.has(g), `${g} está en SELECTABLE y SENTINEL`).toBe(false);
            expect(pending.has(g), `${g} está en SELECTABLE y PENDING_AUTHOR`).toBe(false);
        }
        for (const g of sentinel) {
            expect(pending.has(g), `${g} está en SENTINEL y PENDING_AUTHOR`).toBe(false);
        }
    });

    it('la unión de las tres clases ≡ el enum LiteraryGenre completo (10 valores)', () => {
        const union = [...SELECTABLE_GENRES, ...SENTINEL_GENRES, ...PENDING_AUTHOR_GENRES];
        expect(union.length).toBe(ALL_GENRES.length); // sin duplicados dado el test de exclusión
        expect([...union].sort()).toEqual([...ALL_GENRES].sort());
    });

    it('SELECTABLE_GENRES son exactamente los 7 predicables autorados', () => {
        expect([...SELECTABLE_GENRES].sort()).toEqual(
            ['apocalypse', 'epistle', 'law', 'narrative', 'poetry', 'prophecy', 'wisdom'].sort(),
        );
    });
});

describe('guards de partición', () => {
    it('isSelectableGenre: true solo para predicables', () => {
        for (const g of SELECTABLE_GENRES) expect(isSelectableGenre(g)).toBe(true);
        for (const g of SENTINEL_GENRES) expect(isSelectableGenre(g)).toBe(false);
        for (const g of PENDING_AUTHOR_GENRES) expect(isSelectableGenre(g)).toBe(false);
        expect(isSelectableGenre('xyz')).toBe(false);
    });

    it('isSentinelGenre: true solo para centinelas (gospel/mixed)', () => {
        for (const g of SENTINEL_GENRES) expect(isSentinelGenre(g)).toBe(true);
        for (const g of SELECTABLE_GENRES) expect(isSentinelGenre(g)).toBe(false);
        for (const g of PENDING_AUTHOR_GENRES) expect(isSentinelGenre(g)).toBe(false);
        expect(isSentinelGenre('xyz')).toBe(false);
    });
});
