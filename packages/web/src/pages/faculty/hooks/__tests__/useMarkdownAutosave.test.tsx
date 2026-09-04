import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useMarkdownAutosave } from '../useMarkdownAutosave';

const RETARDO = 1500;

function montar(save: (id: string, md: string) => Promise<unknown>) {
    return renderHook(
        ({ draft, documentId }: { draft: string; documentId: string | null }) =>
            useMarkdownAutosave({
                documentId,
                draft,
                original: 'texto original',
                enabled: true,
                save,
                delayMs: RETARDO,
            }),
        { initialProps: { draft: 'texto original', documentId: 'doc-1' as string | null } },
    );
}

describe('useMarkdownAutosave', () => {
    beforeEach(() => { vi.useFakeTimers({ shouldAdvanceTime: true }); });
    afterEach(() => { vi.useRealTimers(); });

    it('sin cambios no guarda nada', () => {
        const save = vi.fn().mockResolvedValue(undefined);
        montar(save);
        act(() => { vi.advanceTimersByTime(RETARDO * 3); });
        expect(save).not.toHaveBeenCalled();
    });

    it('guarda una vez cuando el usuario deja de escribir, y lo dice', async () => {
        const save = vi.fn().mockResolvedValue(undefined);
        const { result, rerender } = montar(save);

        rerender({ draft: 'texto o', documentId: 'doc-1' });
        rerender({ draft: 'texto original editado', documentId: 'doc-1' });
        expect(save).not.toHaveBeenCalled();  // todavía escribe

        act(() => { vi.advanceTimersByTime(RETARDO); });
        expect(save).toHaveBeenCalledTimes(1);
        expect(save).toHaveBeenCalledWith('doc-1', 'texto original editado');
        await waitFor(() => expect(result.current.status).toBe('saved'));
    });

    it('un fallo se queda visible y el reintento vuelve a mandar lo mismo', async () => {
        const save = vi.fn()
            .mockRejectedValueOnce(new Error('sin red'))
            .mockResolvedValueOnce(undefined);
        const error = vi.spyOn(console, 'error').mockImplementation(() => { });
        const { result, rerender } = montar(save);

        rerender({ draft: 'texto editado', documentId: 'doc-1' });
        act(() => { vi.advanceTimersByTime(RETARDO); });
        await waitFor(() => expect(result.current.status).toBe('error'));

        act(() => { result.current.retry(); });
        await waitFor(() => expect(result.current.status).toBe('saved'));
        expect(save).toHaveBeenNthCalledWith(2, 'doc-1', 'texto editado');
        error.mockRestore();
    });

    it('cerrar el documento guarda lo pendiente sin esperar el temporizador', async () => {
        const save = vi.fn().mockResolvedValue(undefined);
        const { rerender, unmount } = montar(save);

        rerender({ draft: 'texto a medio escribir', documentId: 'doc-1' });
        unmount();

        await waitFor(() => expect(save).toHaveBeenCalledWith('doc-1', 'texto a medio escribir'));
    });

    it('cambiar de documento guarda lo del anterior, no lo del nuevo', async () => {
        const save = vi.fn().mockResolvedValue(undefined);
        const { rerender } = montar(save);

        rerender({ draft: 'lo del primero', documentId: 'doc-1' });
        rerender({ draft: 'lo del primero', documentId: 'doc-2' });

        await waitFor(() => expect(save).toHaveBeenCalledWith('doc-1', 'lo del primero'));
        expect(save).toHaveBeenCalledTimes(1);
    });

    it('deshacer hasta el texto original apaga el error: ya no hay qué guardar', async () => {
        const save = vi.fn().mockRejectedValue(new Error('sin red'));
        const error = vi.spyOn(console, 'error').mockImplementation(() => { });
        const { result, rerender } = montar(save);

        rerender({ draft: 'texto editado', documentId: 'doc-1' });
        act(() => { vi.advanceTimersByTime(RETARDO); });
        await waitFor(() => expect(result.current.status).toBe('error'));

        rerender({ draft: 'texto original', documentId: 'doc-1' });
        await waitFor(() => expect(result.current.status).toBe('idle'));
        error.mockRestore();
    });
});
