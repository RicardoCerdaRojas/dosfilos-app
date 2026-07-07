import { describe, it, expect } from 'vitest';
import {
    APPROACH_TYPES,
    normalizeHomileticalApproach,
    type ApproachType,
} from '../HomileticalApproach';

describe('APPROACH_TYPES — catálogo de seis formas (corregido 2026-07-06)', () => {
    it('contiene exactamente las seis formas, sin expositivo, con temático', () => {
        expect([...APPROACH_TYPES].sort()).toEqual(
            ['apologético', 'evangelístico', 'narrativo', 'pastoral', 'teológico', 'temático'].sort(),
        );
    });

    it('NO incluye expositivo (es condición/G3) ni tópico (es falla)', () => {
        expect(APPROACH_TYPES).not.toContain('expositivo' as ApproachType);
        expect(APPROACH_TYPES).not.toContain('tópico' as ApproachType);
    });
});

describe('normalizeHomileticalApproach', () => {
    it('deja pasar las formas nativas actuales (provenance native, sin marca)', () => {
        for (const form of APPROACH_TYPES) {
            expect(normalizeHomileticalApproach(form)).toEqual({
                approach: form,
                provenance: 'native',
                needsConfirmation: false,
            });
        }
    });

    it('renombra el legado inglés limpio: thematic → temático, narrative → narrativo (renamed)', () => {
        expect(normalizeHomileticalApproach('thematic')).toEqual({
            approach: 'temático',
            provenance: 'renamed',
            needsConfirmation: false,
        });
        expect(normalizeHomileticalApproach('narrative')).toEqual({
            approach: 'narrativo',
            provenance: 'renamed',
            needsConfirmation: false,
        });
    });

    it('expository/expositivo → sin forma (expositividad es condición, no forma; provenance none)', () => {
        expect(normalizeHomileticalApproach('expository')).toEqual({
            approach: undefined,
            provenance: 'none',
            needsConfirmation: false,
        });
        expect(normalizeHomileticalApproach('expositivo')).toEqual({
            approach: undefined,
            provenance: 'none',
            needsConfirmation: false,
        });
    });

    it('topical → temático con provenance legacy_topical (expositividad sin auditar, NO lava el origen)', () => {
        const r = normalizeHomileticalApproach('topical');
        expect(r).toEqual({
            approach: 'temático',
            provenance: 'legacy_topical',
            needsConfirmation: true,
        });
        // La distinción se preserva: no es un temático nativo/limpio.
        expect(r.provenance).not.toBe('native');
    });

    it('vacío/nulo/desconocido → sin forma, provenance none, sin marca', () => {
        expect(normalizeHomileticalApproach(undefined)).toEqual({ provenance: 'none', needsConfirmation: false });
        expect(normalizeHomileticalApproach(null)).toEqual({ provenance: 'none', needsConfirmation: false });
        expect(normalizeHomileticalApproach('')).toEqual({ provenance: 'none', needsConfirmation: false });
        expect(normalizeHomileticalApproach('gibberish')).toEqual({ provenance: 'none', needsConfirmation: false });
    });
});
