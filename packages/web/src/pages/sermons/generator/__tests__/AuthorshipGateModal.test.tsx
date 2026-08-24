import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { AuthorshipReport } from '@dosfilos/domain';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (k: string, o?: Record<string, unknown>) => (o ? `${k}:${JSON.stringify(o)}` : k) }),
}));

import { AuthorshipGateModal } from '../AuthorshipGateModal';

const report: AuthorshipReport = {
    overall: 0.34,
    floor: 0.5,
    gateStatus: 'confront',
    bySection: [
        { sectionId: 'introduction', pastorRatio: 0.8, words: 120, withoutBaseline: false },
        { sectionId: 'body', pastorRatio: 0.2, words: 1400, withoutBaseline: false },
    ],
};

const abrir = (onPublishAnyway = vi.fn(), onBack = vi.fn()) => {
    render(
        <AuthorshipGateModal
            open
            report={report}
            publishing={false}
            onBack={onBack}
            onPublishAnyway={onPublishAnyway}
        />,
    );
    return { onPublishAnyway, onBack };
};

describe('AuthorshipGateModal — confronta, no bloquea', () => {
    it('sin nota suficiente, publicar está deshabilitado', () => {
        abrir();
        expect(screen.getByText('authorship.gatePublish').closest('button')).toBeDisabled();
    });

    it('con una nota de ≥100 caracteres, deja publicar y entrega la nota', () => {
        // El pastor SIEMPRE puede publicar: lo que se le pide es que lo diga con
        // sus palabras, y eso queda auditado. Un piso duro sin salida invita a
        // burlarlo pegando texto cualquiera.
        const { onPublishAnyway } = abrir();
        const nota = 'El borrador captó exactamente lo que quería decir y lo revisé línea por línea antes de subir al púlpito.';
        fireEvent.change(screen.getByRole('textbox'), { target: { value: nota } });
        const boton = screen.getByText('authorship.gatePublish').closest('button')!;
        expect(boton).not.toBeDisabled();
        fireEvent.click(boton);
        expect(onPublishAnyway).toHaveBeenCalledWith(nota);
    });

    it('muestra el desglose por sección: dice DÓNDE trabajar', () => {
        // Un total no ayuda; casi siempre hay una sección que arrastra.
        abrir();
        expect(screen.getByText('80%')).toBeTruthy();
        expect(screen.getByText('20%')).toBeTruthy();
    });

    it('"volver a editar" no publica', () => {
        const { onBack, onPublishAnyway } = abrir();
        fireEvent.click(screen.getByText('authorship.gateBack'));
        expect(onBack).toHaveBeenCalled();
        expect(onPublishAnyway).not.toHaveBeenCalled();
    });

    it('sin informe no renderiza nada', () => {
        const { container } = render(
            <AuthorshipGateModal open report={null} publishing={false} onBack={vi.fn()} onPublishAnyway={vi.fn()} />,
        );
        expect(container.textContent).toBe('');
    });
});
