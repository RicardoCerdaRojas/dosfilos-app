import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { ContextGenreStep } from '../ContextGenreStep';
import type { ContextGenreStepData } from '@dosfilos/domain';

/**
 * Redacción v2 0b-B (§4.4) — el clic del pastor ES el acto, y el acto escribe la
 * PROCEDENCIA. Antes de 0b-B el selector escribía solo `{genre, genreConfirmed}`
 * y la procedencia se adivinaba después escaneando su prosa (`detectGenreInText`),
 * que casi nunca nombra el género → `userConfirmed` vacío en prod.
 */

vi.mock('@dosfilos/application', () => ({
    pastoralSeedService: { retrieveHistoricalContext: vi.fn() },
}));
vi.mock('../stepTimer', () => ({ useStepTimer: () => {} }));
vi.mock('../StepShell', () => ({
    StepShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('../StepHelp', () => ({
    StepHelp: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const baseData: ContextGenreStepData = {
    genre: '',
    genreConfirmed: false,
    genreImplication: '',
    bookLocationNote: '',
    historicalContextConsulted: false,
    timeSpentSeconds: 0,
};

describe('ContextGenreStep — el acto escribe la procedencia (0b-B)', () => {
    beforeEach(() => cleanup());

    it('elegir el género que el libro propone → userConfirmed', () => {
        const onChange = vi.fn();
        // Romanos → epistle (propuesta del libro).
        render(<ContextGenreStep passage="Romanos 8:1" data={baseData} onChange={onChange} />);
        // "Epístola" aparece también en el texto de la propuesta → tomamos el chip.
        const [chip] = screen.getAllByRole('button', { name: 'Epístola' });
        fireEvent.click(chip!);
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                genre: 'epistle',
                genreConfirmed: true,
                genreProvenance: 'userConfirmed',
            }),
        );
    });

    it('elegir otro género → userOverride + target estructurado', () => {
        const onChange = vi.fn();
        render(<ContextGenreStep passage="Romanos 8:1" data={baseData} onChange={onChange} />);
        fireEvent.click(screen.getByText('Poesía'));
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                genre: 'poetry',
                genreProvenance: 'userOverride',
                genreOverrideTarget: 'poetry',
            }),
        );
    });

    it('confirmar la propuesta de un clic también registra el acto', () => {
        const onChange = vi.fn();
        render(<ContextGenreStep passage="Romanos 8:1" data={baseData} onChange={onChange} />);
        fireEvent.click(screen.getByText('confirmar'));
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({ genre: 'epistle', genreProvenance: 'userConfirmed' }),
        );
    });

    it('propuesta centinela: elegir un predicable queda como userOverride (el centinela no es género)', () => {
        const onChange = vi.fn();
        // Juan → gospel (centinela).
        render(<ContextGenreStep passage="Juan 1:1" data={baseData} onChange={onChange} />);
        fireEvent.click(screen.getByText('Narrativa'));
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({ genre: 'narrative', genreProvenance: 'userOverride' }),
        );
    });
});
