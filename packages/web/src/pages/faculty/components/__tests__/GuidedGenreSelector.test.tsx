import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { GuidedGenreSelector } from '../GuidedGenreSelector';

/**
 * Redacción v2 0b-B (§4.4) — el flujo guiado gana el ACTO que no tenía.
 * Mismos 7 predicables del SSOT que el wizard; centinelas y stub fuera.
 */

vi.mock('@/i18n', () => ({
    useTranslation: () => ({
        t: (key: string, vars?: Record<string, string>) =>
            vars?.genre ? `${key}:${vars.genre}` : key,
    }),
}));

describe('GuidedGenreSelector', () => {
    beforeEach(() => cleanup());

    it('ofrece los 7 predicables y ningún centinela/stub', () => {
        render(<GuidedGenreSelector passage="Romanos 8:1" onPronounce={vi.fn()} />);
        expect(screen.getAllByRole('button')).toHaveLength(7);
        expect(screen.queryByText('Evangelio')).toBeNull();
        expect(screen.queryByText('Mixto')).toBeNull();
        expect(screen.queryByText('Parábola')).toBeNull();
    });

    it('un clic registra el acto con el género elegido', async () => {
        const onPronounce = vi.fn().mockResolvedValue('userConfirmed');
        render(<GuidedGenreSelector passage="Romanos 8:1" onPronounce={onPronounce} />);
        fireEvent.click(screen.getByRole('button', { name: 'Epístola' }));
        await waitFor(() => expect(onPronounce).toHaveBeenCalledWith('epistle'));
        await waitFor(() => expect(screen.getByText(/genre.confirmed/)).toBeTruthy());
    });

    it('propuesta centinela (Juan → gospel): pide elegir el predicable de la perícopa', () => {
        render(<GuidedGenreSelector passage="Juan 1:1" onPronounce={vi.fn()} />);
        expect(screen.getByText('genre.sentinelHint')).toBeTruthy();
        expect(screen.queryByText(/genre.proposal/)).toBeNull();
    });

    it('rechazo del dominio (null) NO marca el género como confirmado', async () => {
        const onPronounce = vi.fn().mockResolvedValue(null);
        render(<GuidedGenreSelector passage="Romanos 8:1" onPronounce={onPronounce} />);
        fireEvent.click(screen.getByRole('button', { name: 'Poesía' }));
        await waitFor(() => expect(screen.getByText('genre.error')).toBeTruthy());
        expect(screen.queryByText(/genre.confirmed/)).toBeNull();
    });

    it('busy bloquea el acto (no compite con el turno en vuelo)', () => {
        const onPronounce = vi.fn();
        render(<GuidedGenreSelector passage="Romanos 8:1" onPronounce={onPronounce} busy />);
        fireEvent.click(screen.getByRole('button', { name: 'Epístola' }));
        expect(onPronounce).not.toHaveBeenCalled();
    });
});
