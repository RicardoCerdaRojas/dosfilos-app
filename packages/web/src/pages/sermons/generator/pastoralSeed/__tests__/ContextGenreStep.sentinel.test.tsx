import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ContextGenreStep } from '../ContextGenreStep';
import type { ContextGenreStepData } from '@dosfilos/domain';

/**
 * Redacción v2 0b-A S2-S4 — el selector de género esconde los centinelas
 * (gospel/mixed) y el stub (parable), y cuando la inferencia del libro ES un
 * centinela no ofrece confirmar de un clic: el pastor elige un predicable.
 *
 * Usa el dominio real (inferGenreFromBook, SELECTABLE_GENRES, labels) — solo se
 * stubean los shells de UI y el servicio de aplicación (Firebase).
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

function renderStep(passage: string) {
    return render(<ContextGenreStep passage={passage} data={baseData} onChange={vi.fn()} />);
}

describe('ContextGenreStep — selector consume SELECTABLE_GENRES', () => {
    beforeEach(() => cleanup());

    it('los centinelas y el stub NO aparecen como chips (gospel/mixed/parable)', () => {
        renderStep('Romanos 1:1');
        // Predicables presentes.
        expect(screen.getByText('Narrativa')).toBeTruthy();
        expect(screen.getByText('Profecía')).toBeTruthy();
        // Centinelas + stub ausentes del selector.
        expect(screen.queryByText('Evangelio')).toBeNull();
        expect(screen.queryByText('Mixto')).toBeNull();
        expect(screen.queryByText('Parábola')).toBeNull();
    });
});

describe('ContextGenreStep — propuesta predicable vs centinela', () => {
    beforeEach(() => cleanup());

    it('libro predicable (Romanos → epístola): ofrece confirmar la propuesta', () => {
        renderStep('Romanos 1:1');
        expect(screen.getByText('confirmar')).toBeTruthy();
        // Sin mensaje de reroute centinela.
        expect(screen.queryByText(/gobierna tu perícopa/)).toBeNull();
    });

    it('evangelio (Juan → gospel, centinela): NO confirmar de un clic; muestra reroute', () => {
        renderStep('Juan 1:1');
        expect(screen.queryByText('confirmar')).toBeNull();
        expect(screen.getByText(/Los evangelios combinan relato/)).toBeTruthy();
    });

    it('libro mixto (Daniel → mixed, centinela): NO confirmar; muestra reroute genérico', () => {
        renderStep('Daniel 7:1');
        expect(screen.queryByText('confirmar')).toBeNull();
        expect(screen.getByText(/combina varios géneros según la sección/)).toBeTruthy();
    });
});
