import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { PastoralSeed } from '@dosfilos/domain';

/**
 * Redacción v2 §4.5 — el wizard (Spine A) reporta a la MISMA sombra que el spine
 * socrático. Antes no reportaba nada: un estudio hecho en el wizard era invisible
 * para la calibración del gate.
 */

const record = vi.fn().mockResolvedValue(undefined);
const gate = { enabled: true, loading: false };

vi.mock('@dosfilos/application', () => ({
    passageProfileShadowService: { recordStructuralSufficiency: (...a: unknown[]) => record(...a) },
}));
vi.mock('@/hooks/usePastoralFidelityGate', () => ({
    usePassageProfileGate: () => gate,
}));

const { usePastoralSeedShadow } = await import('../usePastoralSeedShadow');

const NOTA = 'La oración principal gobierna todo el párrafo y ordena el resto del argumento paulino.';

function seedWith(overrides: Record<string, unknown> = {}): PastoralSeed {
    return {
        id: 'seed_abc',
        passage: 'Romanos 8:1',
        contextGenre: {
            genre: 'epistle',
            genreProvenance: 'userConfirmed',
            genreOverrideTarget: null,
        },
        structuralAnalysis: { mainClause: { reference: 'Ro 8:1a', pastorNote: NOTA } },
        ...overrides,
    } as unknown as PastoralSeed;
}

describe('usePastoralSeedShadow', () => {
    beforeEach(() => {
        record.mockClear();
        gate.enabled = true;
    });

    it('registra la vara con la provenance del acto del pastor', () => {
        const { result } = renderHook(() => usePastoralSeedShadow());
        act(() => result.current.recordStructuralSufficiency(seedWith()));
        expect(record).toHaveBeenCalledWith(
            expect.objectContaining({
                seedId: 'seed_abc',
                passage: 'Romanos 8:1',
                qualifiedGenre: 'epistle',
                provenance: 'userConfirmed',
            }),
        );
    });

    it('no reporta dos veces el mismo estudio (ir y volver no infla el conteo)', () => {
        const { result } = renderHook(() => usePastoralSeedShadow());
        act(() => result.current.recordStructuralSufficiency(seedWith()));
        act(() => result.current.recordStructuralSufficiency(seedWith()));
        expect(record).toHaveBeenCalledTimes(1);
    });

    it('con el flag de medición apagado no registra nada', () => {
        gate.enabled = false;
        const { result } = renderHook(() => usePastoralSeedShadow());
        act(() => result.current.recordStructuralSufficiency(seedWith()));
        expect(record).not.toHaveBeenCalled();
    });

    it('nota corta → no hay acto que medir', () => {
        const { result } = renderHook(() => usePastoralSeedShadow());
        act(() =>
            result.current.recordStructuralSufficiency(
                seedWith({ structuralAnalysis: { mainClause: { reference: 'x', pastorNote: 'corto' } } }),
            ),
        );
        expect(record).not.toHaveBeenCalled();
    });

    it('sin seed no explota', () => {
        const { result } = renderHook(() => usePastoralSeedShadow());
        act(() => result.current.recordStructuralSufficiency(null));
        expect(record).not.toHaveBeenCalled();
    });
});
