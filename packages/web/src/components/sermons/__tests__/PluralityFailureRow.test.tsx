import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { SubstantiveClaim } from '@dosfilos/domain';
import { PluralityFailureRow } from '../PluralityFailureRow';

/**
 * Phase 3 PR 3 (ADR-029 §Q4) — behavior test for a plurality failure row.
 *
 * Proves:
 *   - the claim text + its single passage render
 *   - the cross-ref CTA only fires the lookup once expanded (lazy mount)
 *   - parallels surface after expansion
 *   - a claim with no passage shows the "no passage" hint + no CTA
 */

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

const parallelsState = { parallels: [] as Array<{ book: string; chapter: number; verse: number }>, loading: false };
const useCrossReferencesMock = vi.fn(() => ({
    parallels: parallelsState.parallels,
    loading: parallelsState.loading,
    error: null,
    refresh: vi.fn(),
}));
vi.mock('@/hooks/useCrossReferences', () => ({
    useCrossReferences: (passage: string) => useCrossReferencesMock(passage),
}));

function claim(overrides: Partial<SubstantiveClaim> = {}): SubstantiveClaim {
    return {
        claimText: 'El Verbo es preexistente y eterno.',
        detectedLevel: 'core',
        biblicalSources: [{ label: 'Juan 1:1', book: 'Juan', chapter: 1, verseStart: 1 }],
        ...overrides,
    };
}

beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    parallelsState.parallels = [];
    parallelsState.loading = false;
});

describe('PluralityFailureRow', () => {
    it('renders the claim text and its passage', () => {
        render(<PluralityFailureRow claim={claim()} />);
        expect(screen.getByText('El Verbo es preexistente y eterno.')).toBeInTheDocument();
        expect(screen.getByText(/Juan 1:1/)).toBeInTheDocument();
    });

    it('does not fire the cross-ref lookup until the CTA expands', () => {
        render(<PluralityFailureRow claim={claim()} />);
        expect(useCrossReferencesMock).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: /addParallel/ }));
        expect(useCrossReferencesMock).toHaveBeenCalledWith('Juan 1:1');
    });

    it('surfaces proposed parallels once expanded', () => {
        parallelsState.parallels = [
            { book: 'Colosenses', chapter: 1, verse: 16 },
            { book: 'Hebreos', chapter: 1, verse: 3 },
        ];
        render(<PluralityFailureRow claim={claim()} />);
        fireEvent.click(screen.getByRole('button', { name: /addParallel/ }));
        expect(screen.getByText('Colosenses 1:16')).toBeInTheDocument();
        expect(screen.getByText('Hebreos 1:3')).toBeInTheDocument();
    });

    it('shows the no-passage hint and hides the CTA when no passage is cited', () => {
        render(<PluralityFailureRow claim={claim({ biblicalSources: [] })} />);
        expect(screen.getByText('fidelityGate.plurality.noPassage')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /addParallel/ })).not.toBeInTheDocument();
    });
});
