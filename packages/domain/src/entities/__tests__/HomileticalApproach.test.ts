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
    it('deja pasar las formas nativas actuales sin marca', () => {
        for (const form of APPROACH_TYPES) {
            expect(normalizeHomileticalApproach(form)).toEqual({
                approach: form,
                needsConfirmation: false,
            });
        }
    });

    it('renombra el legado inglés: thematic → temático, narrative → narrativo', () => {
        expect(normalizeHomileticalApproach('thematic')).toEqual({
            approach: 'temático',
            needsConfirmation: false,
        });
        expect(normalizeHomileticalApproach('narrative')).toEqual({
            approach: 'narrativo',
            needsConfirmation: false,
        });
    });

    it('expository/expositivo → sin forma (expositividad es condición, no forma)', () => {
        expect(normalizeHomileticalApproach('expository')).toEqual({
            approach: undefined,
            needsConfirmation: false,
        });
        expect(normalizeHomileticalApproach('expositivo')).toEqual({
            approach: undefined,
            needsConfirmation: false,
        });
    });

    it('topical → temático PERO marcado para confirmación (no se fuerza en silencio)', () => {
        expect(normalizeHomileticalApproach('topical')).toEqual({
            approach: 'temático',
            needsConfirmation: true,
        });
    });

    it('vacío/nulo/desconocido → sin forma, sin marca', () => {
        expect(normalizeHomileticalApproach(undefined)).toEqual({ needsConfirmation: false });
        expect(normalizeHomileticalApproach(null)).toEqual({ needsConfirmation: false });
        expect(normalizeHomileticalApproach('')).toEqual({ needsConfirmation: false });
        expect(normalizeHomileticalApproach('gibberish')).toEqual({ needsConfirmation: false });
    });
});
