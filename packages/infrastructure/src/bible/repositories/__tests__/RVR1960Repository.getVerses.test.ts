import { describe, it, expect } from 'vitest';
import { RVR1960Repository } from '../RVR1960Repository';

const repo = new RVR1960Repository();

describe('RVR1960Repository.getVerses — single chapter (sin regresión)', () => {
    it('resuelve el caso que motivó la feature: 2 Pedro 2:10-22 (13 versos, un capítulo)', () => {
        const text = repo.getVerses('2 Pedro 2:10-22');
        expect(text).toBeTruthy();
        // Empieza en v10 y llega a v22 (incluido).
        expect(text).toMatch(/^10 /);
        expect(text).toContain('22 ');
    });

    it('resuelve un solo verso', () => {
        expect(repo.getVerses('Juan 3:16')).toBeTruthy();
    });
});

describe('RVR1960Repository.getVerses — cross-chapter (ADR-035: pasajes grandes)', () => {
    it('lee un rango que CRUZA frontera de capítulo: Juan 1:50-2:2', () => {
        const text = repo.getVerses('Juan 1:50-2:2');
        expect(text).toBeTruthy();
        // Incluye el final del cap 1 (v50, v51) y el inicio del cap 2 (v1, v2).
        expect(text).toContain('1:50 ');
        expect(text).toContain('1:51 ');
        expect(text).toContain('2:1 ');
        expect(text).toContain('2:2 ');
    });

    it('no inventa: un capítulo fuera de rango devuelve null', () => {
        expect(repo.getVerses('Juan 1:1-99:1')).toBeNull();
    });

    it('una referencia inválida sigue devolviendo null', () => {
        expect(repo.getVerses('Cotintios 1:1-2:2')).toBeNull();
    });
});
