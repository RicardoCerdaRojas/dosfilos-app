import { describe, expect, it } from 'vitest';
import { rateLimitDocId, windowIsFull } from '../rateLimit';

describe('windowIsFull', () => {
    const NOW = 1_000_000;
    const HOUR = 3_600_000;

    it('las marcas fuera de la ventana no cuentan', () => {
        const viejas = [NOW - HOUR - 1, NOW - HOUR - 2, NOW - HOUR - 3];
        expect(windowIsFull(viejas, NOW, HOUR, 3)).toBe(false);
    });

    it('topa al alcanzar el máximo, no al superarlo', () => {
        const recientes = [NOW - 10, NOW - 20, NOW - 30];
        expect(windowIsFull(recientes, NOW, HOUR, 3)).toBe(true);
        expect(windowIsFull(recientes, NOW, HOUR, 4)).toBe(false);
    });

    it('la basura en el array no rompe el conteo', () => {
        const sucio = [NOW - 10, null as unknown as number, 'x' as unknown as number];
        expect(windowIsFull(sucio, NOW, HOUR, 2)).toBe(false);
    });
});

describe('rateLimitDocId', () => {
    it('sanea la identidad para usarla como id de documento', () => {
        expect(rateLimitDocId('llm_proxy', 'uid/con/barras')).toBe('llm_proxy__uid_con_barras');
    });

    it('recorta identidades absurdamente largas', () => {
        expect(rateLimitDocId('b', 'x'.repeat(200)).length).toBeLessThanOrEqual(83);
    });
});
