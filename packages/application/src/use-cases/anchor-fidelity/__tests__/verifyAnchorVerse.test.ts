import { describe, it, expect } from 'vitest';
import { RVR1960Repository } from '@dosfilos/infrastructure';
import { verifyAnchorVerse } from '../verifyAnchorVerse';

/**
 * ADR-036 PR2 — Cut 1 (existencia del verso, determinista).
 *
 * Integración real contra RVR1960Repository (no fake): prueba que la composición
 * parser + repo resuelve versos reales, rechaza inexistentes, y maneja
 * cross-chapter (el fix de R1). Si alguien rompe la verificación de existencia,
 * estos casos rompen CI.
 */
describe('verifyAnchorVerse — Cut 1, RVR1960 real', () => {
    const repo = new RVR1960Repository();

    it('verso real existe (Juan 10:28-29 — "no perecerán")', () => {
        const r = verifyAnchorVerse('Juan 10:28-29', repo);
        expect(r.exists).toBe(true);
        expect(r.text.length).toBeGreaterThan(0);
    });

    it('verso simple real existe (Juan 3:16)', () => {
        expect(verifyAnchorVerse('Juan 3:16', repo).exists).toBe(true);
    });

    it('cross-chapter real existe (Juan 1:50-2:2) — fix R1', () => {
        expect(verifyAnchorVerse('Juan 1:50-2:2', repo).exists).toBe(true);
    });

    it('capítulo fuera de rango → NO existe (Juan 99:1)', () => {
        const r = verifyAnchorVerse('Juan 99:1', repo);
        expect(r.exists).toBe(false);
        expect(r.text).toBe('');
    });

    it('verso fuera de rango → NO existe (Juan 10:99)', () => {
        expect(verifyAnchorVerse('Juan 10:99', repo).exists).toBe(false);
    });

    it('libro inválido → NO existe', () => {
        expect(verifyAnchorVerse('Zxqv 1:1', repo).exists).toBe(false);
    });

    it('basura / vacío → NO existe (fail-closed)', () => {
        expect(verifyAnchorVerse('no soy una referencia', repo).exists).toBe(false);
        expect(verifyAnchorVerse('', repo).exists).toBe(false);
        expect(verifyAnchorVerse('   ', repo).exists).toBe(false);
    });
});
