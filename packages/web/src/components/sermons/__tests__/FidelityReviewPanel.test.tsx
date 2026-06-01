import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { FidelityReport } from '@dosfilos/domain';
import { FidelityReviewPanel } from '../FidelityReviewPanel';

/**
 * Phase 3 PR 1 (ADR-029) — render test for the FidelityReviewPanel.
 *
 * Proves:
 *   - flag-off → panel renders nothing (preserves blast-radius-0 default)
 *   - flag-on, no report → "Revisar fidelidad" button is offered
 *   - flag-on, soft-block report → banner + counts render, verdicts grouped
 *   - flag-on, hard-block report → hard banner replaces soft
 *   - clicking the run button invokes the `run` hook
 */

const gateState = { enabled: true, loading: false };
const runMock = vi.fn(async () => undefined);
const runHookState = { running: false, error: null as string | null };

vi.mock('@/hooks/usePastoralFidelityGate', () => ({
    useFidelityPassGate: () => gateState,
}));
vi.mock('@/hooks/useRunFidelityPass', () => ({
    useRunFidelityPass: () => ({ run: runMock, running: runHookState.running, error: runHookState.error }),
}));
vi.mock('sonner', () => ({
    toast: { success: vi.fn(), error: vi.fn() },
}));
// Passthrough i18n so assertions target the translation KEY, not copy.
vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'es' } }),
}));

function makeReport(overrides: Partial<FidelityReport> = {}): FidelityReport {
    return {
        version: '1',
        reportId: 'r-1',
        sermonId: 'sermon-1',
        generatedAt: new Date('2026-05-30T12:00:00Z'),
        modelTier: 'flash',
        verdicts: [
            {
                marker: 1,
                claim: 'En el principio era el Verbo.',
                citedSource: {
                    sourceId: 'S1',
                    resourceId: 'res-1',
                    chunkId: 'c-1',
                    title: 'SBLGNT Juan 1:1',
                    excerpt: 'Ἐν ἀρχῇ ἦν ὁ λόγος.',
                },
                verdict: 'supports',
                reasoning: 'Coincide con el texto griego del prólogo.',
                confidence: 0.92,
                modelUsed: 'flash',
                evaluatedAt: new Date('2026-05-30T12:00:00Z'),
            },
            {
                marker: 2,
                claim: 'El Verbo creó el cosmos.',
                citedSource: {
                    sourceId: 'S2',
                    resourceId: 'res-2',
                    chunkId: 'c-2',
                    title: 'Comentario al prólogo joánico',
                    excerpt: 'El logos joánico es agente de la creación.',
                },
                verdict: 'partial',
                reasoning: 'La fuente lo afirma con matices históricos.',
                confidence: 0.55,
                modelUsed: 'sonnet',
                evaluatedAt: new Date('2026-05-30T12:01:00Z'),
            },
        ],
        summary: {
            supports: 1,
            partial: 1,
            unrelated: 0,
            contradicts: 0,
            totalMarkers: 2,
            unrelatedRatio: 0,
            partialRatio: 0.5,
        },
        gateStatus: 'soft-block',
        ...overrides,
    };
}

describe('FidelityReviewPanel', () => {
    beforeEach(() => {
        cleanup();
        gateState.enabled = true;
        gateState.loading = false;
        runHookState.running = false;
        runHookState.error = null;
        runMock.mockClear();
    });

    it('renders nothing when the fidelity_pass sub-flag is off', () => {
        gateState.enabled = false;
        const { container } = render(<FidelityReviewPanel sermonId="sermon-1" />);
        expect(container.firstChild).toBeNull();
    });

    it('offers a "Revisar fidelidad" CTA when no report exists yet', () => {
        render(<FidelityReviewPanel sermonId="sermon-1" />);
        expect(screen.getByTestId('fidelity-review-panel')).toBeTruthy();
        expect(screen.getByTestId('fidelity-run-button')).toBeTruthy();
        expect(screen.queryByTestId('fidelity-gate-banner-pass')).toBeNull();
    });

    it('renders the soft-block banner and verdict groups when a soft report is present', () => {
        render(<FidelityReviewPanel sermonId="sermon-1" report={makeReport()} />);
        expect(screen.getByTestId('fidelity-gate-banner-soft')).toBeTruthy();
        expect(screen.getByText('fidelityReview.attention')).toBeTruthy();
        expect(screen.getByText('fidelityReview.supported')).toBeTruthy();
        expect(screen.getByTestId('fidelity-verdict-row-1')).toBeTruthy();
        expect(screen.getByTestId('fidelity-verdict-row-2')).toBeTruthy();
    });

    it('renders the hard-block banner when the gate is hard-blocked', () => {
        render(
            <FidelityReviewPanel
                sermonId="sermon-1"
                report={makeReport({ gateStatus: 'hard-block' })}
            />,
        );
        expect(screen.getByTestId('fidelity-gate-banner-hard')).toBeTruthy();
        expect(screen.queryByTestId('fidelity-gate-banner-soft')).toBeNull();
    });

    it('invokes the run hook when "Revisar fidelidad" is clicked', () => {
        render(<FidelityReviewPanel sermonId="sermon-42" />);
        fireEvent.click(screen.getByTestId('fidelity-run-button'));
        expect(runMock).toHaveBeenCalledWith('sermon-42');
    });
});
