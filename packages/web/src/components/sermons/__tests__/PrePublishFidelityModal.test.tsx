import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import {
    FIDELITY_OVERRIDE_MIN_CHARS,
    type FidelityReport,
} from '@dosfilos/domain';
import { PrePublishFidelityModal } from '../PrePublishFidelityModal';

/**
 * Phase 3 PR 2 (ADR-029 §Q3/Q5) — behavior test for the pre-publish gate
 * modal.
 *
 * Proves:
 *   - pass / null report → renders nothing
 *   - hard-block → no override field, override callback never reachable
 *   - soft-block → override field present; publish disabled until the
 *     justification reaches the minimum; valid override fires the callback
 *     with the trimmed reason
 */

// Passthrough i18n so assertions target the translation KEY, not copy.
vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

function makeReport(gateStatus: FidelityReport['gateStatus']): FidelityReport {
    return {
        version: '1',
        reportId: 'r-1',
        sermonId: 'sermon-1',
        generatedAt: new Date('2026-05-30T12:00:00Z'),
        modelTier: 'flash',
        verdicts: [],
        summary: {
            supports: 6,
            partial: 2,
            unrelated: 1,
            contradicts: 0,
            totalMarkers: 9,
            unrelatedRatio: 0.11,
            partialRatio: 0.22,
        },
        gateStatus,
    };
}

const noop = () => undefined;

beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('PrePublishFidelityModal', () => {
    it('renders nothing for a passing report', () => {
        const { container } = render(
            <PrePublishFidelityModal
                open
                onOpenChange={noop}
                report={makeReport('pass')}
                publishing={false}
                onConfirmOverride={vi.fn()}
            />,
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing when there is no report', () => {
        const { container } = render(
            <PrePublishFidelityModal
                open
                onOpenChange={noop}
                report={null}
                publishing={false}
                onConfirmOverride={vi.fn()}
            />,
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('hard-block offers no override path', () => {
        render(
            <PrePublishFidelityModal
                open
                onOpenChange={noop}
                report={makeReport('hard-block')}
                publishing={false}
                onConfirmOverride={vi.fn()}
            />,
        );
        expect(screen.getByText('fidelityGate.hardTitle')).toBeInTheDocument();
        expect(screen.queryByText('fidelityGate.override.label')).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'fidelityGate.publishAnyway' }),
        ).not.toBeInTheDocument();
    });

    it('soft-block disables publish until the justification is long enough', () => {
        const onConfirmOverride = vi.fn();
        render(
            <PrePublishFidelityModal
                open
                onOpenChange={noop}
                report={makeReport('soft-block')}
                publishing={false}
                onConfirmOverride={onConfirmOverride}
            />,
        );

        const publishBtn = screen.getByRole('button', { name: 'fidelityGate.publishAnyway' });
        expect(publishBtn).toBeDisabled();

        const textarea = screen.getByLabelText('fidelityGate.override.label');
        fireEvent.change(textarea, { target: { value: 'x'.repeat(FIDELITY_OVERRIDE_MIN_CHARS - 1) } });
        expect(publishBtn).toBeDisabled();

        fireEvent.change(textarea, { target: { value: 'x'.repeat(FIDELITY_OVERRIDE_MIN_CHARS) } });
        expect(publishBtn).toBeEnabled();

        fireEvent.click(publishBtn);
        expect(onConfirmOverride).toHaveBeenCalledWith('x'.repeat(FIDELITY_OVERRIDE_MIN_CHARS));
    });
});
