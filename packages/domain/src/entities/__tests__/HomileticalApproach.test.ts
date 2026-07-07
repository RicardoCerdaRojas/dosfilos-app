import { describe, it, expect } from 'vitest';
import {
    APPROACH_TYPES,
    normalizeHomileticalApproach,
    isApproachType,
    ApproachFactory,
    type ApproachType,
    type HomileticalApproach,
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

describe('isApproachType — guard de membresía en el borde de escritura', () => {
    it('acepta solo las seis formas del catálogo', () => {
        for (const form of APPROACH_TYPES) expect(isApproachType(form)).toBe(true);
    });

    it('rechaza legado, condición, basura y no-strings (presencia ≠ validez)', () => {
        for (const bad of ['expositivo', 'expository', 'thematic', 'topical', 'narrative']) {
            expect(isApproachType(bad)).toBe(false); // legado/condición NO es forma válida actual
        }
        expect(isApproachType('pastoral con tono de ánimo')).toBe(false); // tono filtrado como forma (corrupto)
        expect(isApproachType('**La Revelación del Carácter de Dios**: ...')).toBe(false); // bloque de prompt filtrado
        expect(isApproachType('')).toBe(false);
        expect(isApproachType(undefined)).toBe(false);
        expect(isApproachType(null)).toBe(false);
        expect(isApproachType(42)).toBe(false);
        expect(isApproachType({})).toBe(false);
    });
});

describe('ApproachFactory — fail-closed en la construcción (write border)', () => {
    const good = (over: Record<string, unknown> = {}) => ({
        type: 'temático',
        direction: 'd',
        homileticalProposition: 'hp',
        outline: { mainPoints: [] },
        ...over,
    });

    it('createFromAIResponse construye cuando el type es una forma válida', () => {
        const a = ApproachFactory.createFromAIResponse(good(), 0);
        expect(a.type).toBe('temático');
        expect(ApproachFactory.validate(a)).toBe(true);
    });

    it('createFromAIResponse RECHAZA (throw) un type no-miembro: tono, bloque de prompt, legado', () => {
        expect(() => ApproachFactory.createFromAIResponse(good({ type: 'pastoral con tono de ánimo' }), 0)).toThrow(/Invalid approach type/);
        expect(() => ApproachFactory.createFromAIResponse(good({ type: 'expositivo' }), 0)).toThrow(/Invalid approach type/);
        expect(() => ApproachFactory.createFromAIResponse(good({ type: 'gibberish' }), 0)).toThrow(/Invalid approach type/);
    });

    it('validate() usa membresía, no truthy: un type corrupto colado falla el filtro', () => {
        const corrupt = { ...good(), id: 'x-1', tone: 'didáctico', type: 'pastoral con tono de ánimo' } as unknown as HomileticalApproach;
        expect(ApproachFactory.validate(corrupt)).toBe(false);
    });
});
