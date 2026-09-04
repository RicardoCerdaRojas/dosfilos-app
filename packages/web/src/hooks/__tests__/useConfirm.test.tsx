import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// El barril de `@/i18n` arrastra la configuración de Firebase, que en
// pruebas no existe. Se mockea igual que en el resto de los tests de
// componentes: acá lo que se prueba es la promesa, no las traducciones.
vi.mock('@/i18n', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

import { useConfirm } from '../useConfirm';

function Pantalla({ onResultado }: { onResultado: (ok: boolean) => void }) {
    const { confirm, confirmDialog } = useConfirm();
    return (
        <>
            <button onClick={async () => onResultado(await confirm({ title: 'Borrar', body: '¿Seguro?' }))}>
                borrar
            </button>
            {confirmDialog}
        </>
    );
}

describe('useConfirm', () => {
    it('no muestra nada hasta que se pregunta', () => {
        render(<Pantalla onResultado={() => { }} />);
        expect(screen.queryByText('¿Seguro?')).not.toBeInTheDocument();
    });

    it('confirmar resuelve true', async () => {
        const resultados: boolean[] = [];
        render(<Pantalla onResultado={ok => resultados.push(ok)} />);
        await userEvent.click(screen.getByText('borrar'));
        await userEvent.click(await screen.findByText('buttons.confirm'));
        await waitFor(() => expect(resultados).toEqual([true]));
    });

    it('cancelar resuelve false: ante la duda no se destruye', async () => {
        const resultados: boolean[] = [];
        render(<Pantalla onResultado={ok => resultados.push(ok)} />);
        await userEvent.click(screen.getByText('borrar'));
        await userEvent.click(await screen.findByText('buttons.cancel'));
        await waitFor(() => expect(resultados).toEqual([false]));
    });

    it('cerrar con Escape también resuelve false', async () => {
        const resultados: boolean[] = [];
        render(<Pantalla onResultado={ok => resultados.push(ok)} />);
        await userEvent.click(screen.getByText('borrar'));
        await screen.findByText('¿Seguro?');
        await userEvent.keyboard('{Escape}');
        await waitFor(() => expect(resultados).toEqual([false]));
    });
});
