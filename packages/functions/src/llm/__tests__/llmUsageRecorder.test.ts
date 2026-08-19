import { describe, expect, it } from 'vitest';
import { safeMapKey, usageDayKey } from '../llmUsageRecorder';

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
