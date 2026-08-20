import { describe, expect, it } from 'vitest';
import { buildUsagePatch, safeMapKey, usageDayKey } from '../llmUsageRecorder';

describe('usageDayKey', () => {
    it('agrupa por día UTC', () => {
        expect(usageDayKey(new Date('2026-08-19T23:59:59Z'))).toBe('2026-08-19');
        expect(usageDayKey(new Date('2026-08-20T00:00:01Z'))).toBe('2026-08-20');
    });
});

describe('safeMapKey', () => {
    it('reemplaza los caracteres que Firestore prohíbe en claves de mapa', () => {
        expect(safeMapKey('sermon.draft/shadow')).toBe('sermon_draft_shadow');
        expect(safeMapKey('a[0]#b*c~d')).toBe('a_0__b_c_d');
    });

    it('un nombre vacío no rompe la ruta del campo', () => {
        expect(safeMapKey('')).toBe('unknown');
        expect(safeMapKey('   ')).toBe('unknown');
    });

    it('recorta nombres absurdamente largos', () => {
        expect(safeMapKey('x'.repeat(500)).length).toBe(100);
    });
});

/**
 * Regresión del bug de los cortes vacíos: el patch escribía
 * `{'byFeature.x.calls': 1}` — claves LITERALES con puntos — porque
 * `set(..., {merge:true})` no interpreta puntos como rutas de campo (solo
 * `update()` lo hace). Los totales se veían bien y los cortes salían vacíos,
 * que es el peor tipo de bug: el panel no fallaba, mentía a medias.
 */
describe('buildUsagePatch — forma del documento', () => {
    const record = {
        model: 'gemini-2.5-flash',
        feature: 'hebrewTutor.analyzeVerse',
        userId: 'uid_1',
        inputTokens: 1000,
        outputTokens: 500,
    };

    it('los cortes son mapas ANIDADOS, nunca claves con puntos', () => {
        const patch = buildUsagePatch(record);
        const conPuntos = Object.keys(patch).filter((k) => k.includes('.'));
        expect(conPuntos, `Claves con puntos: ${conPuntos.join(', ')}`).toEqual([]);
        expect(typeof patch.byFeature).toBe('object');
        expect(typeof patch.byModel).toBe('object');
        expect(typeof patch.byUser).toBe('object');
    });

    it('el nombre de la feature se sanea DENTRO del mapa, no en la ruta', () => {
        const patch = buildUsagePatch(record) as { byFeature: Record<string, unknown> };
        expect(Object.keys(patch.byFeature)).toEqual(['hebrewTutor_analyzeVerse']);
    });

    it('sin userId no se escribe el corte por usuario', () => {
        const patch = buildUsagePatch({ ...record, userId: undefined });
        expect('byUser' in patch).toBe(false);
    });

    it('un modelo con precio conocido no suma al contador de respaldo', () => {
        expect('usdFromFallbackPricing' in buildUsagePatch(record)).toBe(false);
        expect('usdFromFallbackPricing' in buildUsagePatch({ ...record, model: 'inventado' })).toBe(true);
    });
});
