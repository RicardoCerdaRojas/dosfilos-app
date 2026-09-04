import { describe, it, expect } from 'vitest';
import { STALLED_AFTER_SECONDS, isStalledExtraction } from '../sweepStalledExtractions';

const AHORA = new Date('2026-09-04T12:00:00Z');
const haceSegundos = (s: number) => new Date(AHORA.getTime() - s * 1000);

describe('isStalledExtraction', () => {
    it('deja viva la extracción que todavía puede estar corriendo', () => {
        // El callable de reproceso tiene 900 s de tope: a los 800 s hay
        // alguien trabajando de verdad.
        expect(isStalledExtraction({ processingStartedAt: haceSegundos(800) }, AHORA)).toBe(false);
    });

    it('cierra la que superó la invocación más larga posible', () => {
        expect(isStalledExtraction({ processingStartedAt: haceSegundos(STALLED_AFTER_SECONDS + 60) }, AHORA)).toBe(true);
    });

    it('sin comienzo no se toca: matar por sospecha es el error inverso', () => {
        expect(isStalledExtraction({}, AHORA)).toBe(false);
        expect(isStalledExtraction({ processingStartedAt: null, updatedAt: null }, AHORA)).toBe(false);
    });

    it('cae a updatedAt cuando el recurso es anterior a processingStartedAt', () => {
        expect(isStalledExtraction({ updatedAt: haceSegundos(STALLED_AFTER_SECONDS + 60) }, AHORA)).toBe(true);
        expect(isStalledExtraction({ updatedAt: haceSegundos(60) }, AHORA)).toBe(false);
    });

    it('el umbral cubre el techo del reproceso de 900 s', () => {
        expect(STALLED_AFTER_SECONDS).toBeGreaterThan(900);
    });
});
