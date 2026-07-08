import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

/**
 * Redacción v2 Fase 1 (§4.5) B3 — la topología del gate MANDA, no la degradación
 * graciosa. step3_genre_help ON con un prereq OFF → gate disabled → sin ayuda.
 * Ata la cadena real: pastoral_fidelity_flow + passage_profile + step3_genre_help.
 */
const flagState: Record<string, boolean> = {};
vi.mock('@/hooks/useFeatureFlag', () => ({
    useFeatureFlag: (name: string) => ({ enabled: flagState[name] ?? false, loading: false }),
}));
// usePastoralFidelityGate arrastra useUserProfile (→ firebase) por import; se
// mockea para aislar el gate de la capa de datos en el test.
vi.mock('@/hooks/useUserProfile', () => ({
    useUserProfile: () => ({ profile: null, loading: false }),
}));

import { useStep3GenreHelpGate } from '../usePastoralFidelityGate';

function setFlags(f: Record<string, boolean>) {
    for (const k of Object.keys(flagState)) delete flagState[k];
    Object.assign(flagState, f);
}

const enabled = () => renderHook(() => useStep3GenreHelpGate()).result.current.enabled;

describe('useStep3GenreHelpGate — la cadena de flags manda', () => {
    it('los tres ON → enabled', () => {
        setFlags({ pastoral_fidelity_flow: true, passage_profile: true, step3_genre_help: true });
        expect(enabled()).toBe(true);
    });

    it('step3_genre_help ON pero pastoral_fidelity_flow OFF → disabled (sin ayuda)', () => {
        setFlags({ pastoral_fidelity_flow: false, passage_profile: true, step3_genre_help: true });
        expect(enabled()).toBe(false);
    });

    it('step3_genre_help ON pero passage_profile OFF (subsistema de género apagado) → disabled', () => {
        setFlags({ pastoral_fidelity_flow: true, passage_profile: false, step3_genre_help: true });
        expect(enabled()).toBe(false);
    });

    it('prereqs ON pero step3_genre_help OFF → disabled (default)', () => {
        setFlags({ pastoral_fidelity_flow: true, passage_profile: true, step3_genre_help: false });
        expect(enabled()).toBe(false);
    });
});
