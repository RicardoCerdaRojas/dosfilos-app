import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import {
    aggregateWitnessResult,
    escalateWitnessedClaim,
    type WitnessResult,
    type WitnessVerdict,
} from '@dosfilos/domain';
import { WitnessGate } from '../witnesses/WitnessGate';

/**
 * Pastoral Fidelity Phase 2 — witness gate render test (ADR-011).
 *
 * Proves the escalation UI contract at the render level, independent of
 * the LLM callable:
 *   - pass everywhere   → "Continuar al borrador" enabled
 *   - soft/hard block   → proceed blocked until the response meets the min
 *   - absolute block    → no override; "Revisar afirmación" instead
 */

// The validation hook is mocked to return a fixed, pre-escalated result so
// the test exercises the gate UI, not the network call.
const resultRef: { current: WitnessResult | null } = { current: null };
vi.mock('@/hooks/useWitnessValidation', () => ({
    useWitnessValidation: () => ({
        result: resultRef.current,
        loading: false,
        error: null,
        cacheHit: false,
        validate: vi.fn(),
        reset: vi.fn(),
    }),
}));
vi.mock('@/hooks/useCrossReferences', () => ({
    useCrossReferences: () => ({ parallels: [], loading: false, error: null, refresh: vi.fn() }),
}));
vi.mock('@/hooks/useFeatureFlag', () => ({
    useFeatureFlag: () => ({ enabled: true, loading: false }),
}));

function verdict(over: Partial<WitnessVerdict>): WitnessVerdict {
    return { witness: 'context', dissents: false, reasoning: '', evidence: [], confidence: 0.9, ...over };
}

function buildResult(claims: Array<{ key: string; level: any; dissents: number }>): WitnessResult {
    const witnessed = claims.map((c) =>
        escalateWitnessedClaim({
            key: c.key,
            kind: c.key === 'centralIdea' ? 'centralIdea' : 'observation',
            text: `Texto de ${c.key}`,
            detectedLevel: c.level,
            verdicts: (['context', 'parallels', 'confession'] as const).map((wn, i) =>
                verdict({ witness: wn, dissents: i < c.dissents, confidence: 0.9 }),
            ),
        }),
    );
    return aggregateWitnessResult({
        seedId: 'seed-1',
        sermonId: 'sermon-1',
        claims: witnessed,
        confessionalWitnessesEnabled: true,
    });
}

const seed: any = {
    id: 'seed-1',
    sermonId: 'sermon-1',
    passage: 'Juan 1:1',
    insight: { centralIdea: 'x', observations: ['y'], doxologicalApplication: 'z' },
    syntax: { mainClause: { reference: '', pastorNote: '' } },
    morphology: { wordStudies: [] },
    function: { originalAudienceFunction: '' },
    recognition: { parallels: [] },
};

function renderGate(overrides: Partial<React.ComponentProps<typeof WitnessGate>> = {}) {
    return render(
        <WitnessGate
            seed={seed}
            confessionalWitnessesEnabled={true}
            onProceed={overrides.onProceed ?? vi.fn()}
            onReviseClaim={overrides.onReviseClaim ?? vi.fn()}
            onBack={overrides.onBack ?? vi.fn()}
        />,
    );
}

describe('WitnessGate — escalation UI', () => {
    beforeEach(() => {
        cleanup();
        resultRef.current = null;
    });

    it('enables "Continuar al borrador" when every claim passes', () => {
        resultRef.current = buildResult([{ key: 'centralIdea', level: 'distinctive', dissents: 0 }]);
        renderGate();
        const btn = screen.getByText('Continuar al borrador →') as HTMLButtonElement;
        expect(btn).toBeTruthy();
        expect(btn.closest('button')?.disabled).toBe(false);
    });

    it('blocks proceed on a soft-block until a ≥50 char response is written', () => {
        resultRef.current = buildResult([{ key: 'centralIdea', level: 'distinctive', dissents: 2 }]);
        const onProceed = vi.fn();
        renderGate({ onProceed });

        expect(screen.getByText('Requiere tu respuesta')).toBeTruthy();
        const proceed = screen.getByText('Responde a los testigos para continuar').closest('button')!;
        expect(proceed.disabled).toBe(true);

        // Short response — still blocked.
        const textarea = screen.getByPlaceholderText(/Reconozco \/ reformulo/);
        fireEvent.change(textarea, { target: { value: 'A'.repeat(20) } });
        expect(screen.getByText('Responde a los testigos para continuar').closest('button')!.disabled).toBe(true);

        // Valid response — proceed enabled.
        fireEvent.change(textarea, { target: { value: 'A'.repeat(55) } });
        const enabled = screen.getByText('Continuar al borrador →').closest('button')!;
        expect(enabled.disabled).toBe(false);
        fireEvent.click(enabled);
        expect(onProceed).toHaveBeenCalledTimes(1);
    });

    it('offers revise (no override) on an absolute-block', () => {
        resultRef.current = buildResult([{ key: 'centralIdea', level: 'core', dissents: 1 }]);
        const onReviseClaim = vi.fn();
        renderGate({ onReviseClaim });

        expect(screen.getByText('Límite cristiano clásico')).toBeTruthy();
        const revise = screen.getByText('Revisar afirmación (Paso 6)');
        expect(revise).toBeTruthy();
        expect(screen.queryByText('Continuar al borrador →')).toBeNull();
        fireEvent.click(revise);
        expect(onReviseClaim).toHaveBeenCalledTimes(1);
    });
});
