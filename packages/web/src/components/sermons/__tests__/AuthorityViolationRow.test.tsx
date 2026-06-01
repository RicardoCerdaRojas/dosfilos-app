import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { AuthorityViolation } from '@dosfilos/domain';
import { AuthorityViolationRow } from '../AuthorityViolationRow';

/**
 * Phase 3 PR 4 — render test for an authority-subordination finding.
 */

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

function violation(overrides: Partial<AuthorityViolation> = {}): AuthorityViolation {
    return {
        claim: 'Esto es verdad porque la Confesión de Westminster lo afirma.',
        citedAuthority: 'Confesión de Westminster 2.1',
        reformulationHint: 'Muestra qué exige el texto del pasaje; cita la confesión como testigo.',
        reasoning: 'La confesión carga el peso del argumento, no el texto.',
        ...overrides,
    };
}

beforeEach(() => cleanup());

describe('AuthorityViolationRow', () => {
    it('renders the claim, the cited authority, and the reformulation hint', () => {
        render(<AuthorityViolationRow violation={violation()} />);
        expect(screen.getByText(/Confesión de Westminster lo afirma/)).toBeInTheDocument();
        expect(screen.getByText('Confesión de Westminster 2.1')).toBeInTheDocument();
        expect(screen.getByText(/cita la confesión como testigo/)).toBeInTheDocument();
        expect(screen.getByText('fidelityGate.authority.reformulation')).toBeInTheDocument();
    });

    it('falls back to a generic label when the authority is unnamed', () => {
        render(<AuthorityViolationRow violation={violation({ citedAuthority: '' })} />);
        expect(screen.getByText('fidelityGate.authority.unnamedAuthority')).toBeInTheDocument();
    });

    it('omits the reformulation block when no hint is provided', () => {
        render(<AuthorityViolationRow violation={violation({ reformulationHint: '' })} />);
        expect(screen.queryByText('fidelityGate.authority.reformulation')).not.toBeInTheDocument();
    });
});
