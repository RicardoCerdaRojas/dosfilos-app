import { describe, it, expect } from 'vitest';
import {
    AUTO_INDEX_GRACE_SECONDS,
    autoIndexGraceRemainingMs,
    isWithinAutoIndexGrace,
} from '../autoIndexGrace';

const AHORA = new Date('2026-09-04T12:00:00Z');
const haceSegundos = (s: number) => ({ updatedAt: new Date(AHORA.getTime() - s * 1000) });

describe('isWithinAutoIndexGrace', () => {
    it('supone que el disparador corre durante los primeros segundos', () => {
        expect(isWithinAutoIndexGrace(haceSegundos(3), AHORA)).toBe(true);
        expect(isWithinAutoIndexGrace(haceSegundos(AUTO_INDEX_GRACE_SECONDS - 1), AHORA)).toBe(true);
    });

    it('deja de suponerlo cuando el servidor nunca confirmó', () => {
        // El caso observado: «Indexando… hace 57 s» sobre un documento
        // que nadie estaba indexando. A los dos minutos la tarjeta
        // recupera su botón «Procesar».
        expect(isWithinAutoIndexGrace(haceSegundos(AUTO_INDEX_GRACE_SECONDS + 1), AHORA)).toBe(false);
        expect(isWithinAutoIndexGrace(haceSegundos(3600), AHORA)).toBe(false);
    });

    it('concede el beneficio de la duda cuando no hay ancla', () => {
        expect(isWithinAutoIndexGrace({ updatedAt: undefined as unknown as Date }, AHORA)).toBe(true);
        expect(isWithinAutoIndexGrace({ updatedAt: new Date('no es fecha') }, AHORA)).toBe(true);
    });
});

describe('autoIndexGraceRemainingMs', () => {
    it('dice cuánto falta, para poder reprogramar la revisión', () => {
        expect(autoIndexGraceRemainingMs(haceSegundos(20), AHORA)).toBe((AUTO_INDEX_GRACE_SECONDS - 20) * 1000);
    });

    it('nunca devuelve negativo', () => {
        expect(autoIndexGraceRemainingMs(haceSegundos(10_000), AHORA)).toBe(0);
    });
});
