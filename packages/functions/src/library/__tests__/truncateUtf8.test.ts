import { describe, it, expect } from 'vitest';
import { truncateUtf8 } from '../truncateUtf8';

describe('truncateUtf8', () => {
    it('no toca lo que ya cabe', () => {
        expect(truncateUtf8('πᾶσαν χαρὰν', 1000)).toBe('πᾶσαν χαρὰν');
    });

    it('corta por bytes, no por caracteres', () => {
        const griego = 'πᾶσαν χαρὰν ἡγήσασθε'.repeat(100);
        const cortado = truncateUtf8(griego, 500);
        expect(Buffer.byteLength(cortado, 'utf8')).toBeLessThanOrEqual(500);
        expect(cortado.length).toBeLessThan(500);  // menos caracteres que bytes: son de 2 bytes
    });

    it('nunca parte un carácter por la mitad', () => {
        const cortado = truncateUtf8('ααααα', 5);  // cada α son 2 bytes
        expect(cortado).toBe('αα');
        expect(Buffer.byteLength(cortado, 'utf8')).toBe(4);
    });
});
