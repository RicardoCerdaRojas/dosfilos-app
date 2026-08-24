import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

const translate = vi.fn();
vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'es' } }),
}));
vi.mock('@/hooks/useCitationTranslation', () => ({
    useCitationTranslation: () => ({ translate, translating: false, error: false }),
}));

import { CitationQuote } from '../CitationQuote';

const EN =
    'From the LORD. RSV has, more literally, from the presence of the LORD. At first sight this phrase seems to imply that Jonah believed it possible to escape from God presence by fleeing to Tarshish.';
const ES =
    'Se trata de la verdad eterna que Dios reveló al inspirar esa porción de las Escrituras. Es la manera en que Dios trata con su pueblo, y se expresa en términos de lo que sucede ahora.';

const cita = (texto: string) => (
    <CitationQuote>
        <p>«{texto}»</p>
        <p>— David W. Baker, Obadiah, Jonah and Micah</p>
    </CitationQuote>
);

describe('CitationQuote', () => {
    beforeEach(() => translate.mockReset());

    it('ofrece traducir una cita en inglés a un lector en español', () => {
        render(cita(EN));
        expect(screen.getByText('citations.translate')).toBeTruthy();
    });

    it('NO ofrece traducir lo que el lector ya lee', () => {
        render(cita(ES));
        expect(screen.queryByText('citations.translate')).toBeNull();
    });

    it('al traducir, ROTULA la traducción — no se hace pasar por la cita', () => {
        // Sin el rótulo, una traducción con el nombre del autor debajo se lee
        // como sus palabras. Eso es lo que el ancla verificable existe para
        // impedir.
        translate.mockResolvedValue('Del SEÑOR. La RSV traduce, más literalmente, "de la presencia del SEÑOR".');
        render(cita(EN));
        fireEvent.click(screen.getByText('citations.translate'));
        return waitFor(() => {
            expect(screen.getByText('citations.ownTranslation')).toBeTruthy();
            expect(screen.getByText(/Del SEÑOR/)).toBeTruthy();
        });
    });

    it('el original queda A UN CLIC, nunca se pierde', () => {
        translate.mockResolvedValue('Traducción');
        render(cita(EN));
        fireEvent.click(screen.getByText('citations.translate'));
        return waitFor(() => screen.getByText('citations.seeOriginal')).then(() => {
            fireEvent.click(screen.getByText('citations.seeOriginal'));
            expect(screen.getByText(/From the LORD/)).toBeTruthy();
        });
    });

    it('no traduce la atribución: un nombre propio traducido sería un error', () => {
        translate.mockResolvedValue('Traducción');
        render(cita(EN));
        fireEvent.click(screen.getByText('citations.translate'));
        return waitFor(() => {
            expect(translate).toHaveBeenCalledTimes(1);
            const enviado = translate.mock.calls[0]![0] as string;
            expect(enviado).not.toContain('David W. Baker');
            expect(enviado).toContain('From the LORD');
        });
    });
});
