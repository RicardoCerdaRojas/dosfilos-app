import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const gate = { enabled: true };
const scan = vi.fn();
const toastError = vi.fn();

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('sonner', () => ({ toast: { error: (m: string) => toastError(m), success: vi.fn() } }));
vi.mock('@dosfilos/application', () => ({ sermonService: { recordContraScan: vi.fn() } }));
vi.mock('@/context/firebase-context', () => ({ useFirebase: () => ({ user: { uid: 'u1' } }) }));
vi.mock('../usePastoralFidelityGate', () => ({ useContraScanGate: () => gate }));
// El hook real DESESTRUCTURA: `const { scan } = useFindDissentingChunks()`.
vi.mock('../useFindDissentingChunks', () => ({ useFindDissentingChunks: () => ({ scan, loading: false }) }));

import { useSermonContraScan } from '../useSermonContraScan';

describe('useSermonContraScan — un fallo del escaneo NO puede terminar en silencio', () => {
    beforeEach(() => {
        gate.enabled = true;
        scan.mockReset();
        toastError.mockReset();
    });

    it('si el escaneo falla, AVISA y deja seguir publicando', async () => {
        // El bug: `try` con `finally` pero sin `catch`. La excepción subía a
        // `handlePublish` —que tampoco captura— y moría como promesa rechazada.
        // El spinner se apagaba y no pasaba nada: ni aviso, ni modal, ni
        // publicación. El pastor no sabía si su sermón se había publicado.
        scan.mockRejectedValue(new Error('callable timeout'));
        const onCleared = vi.fn();
        const { result } = renderHook(() => useSermonContraScan({ onCleared }));

        await act(async () => {
            await result.current.attempt('s1', 'idea central');
        });

        expect(toastError).toHaveBeenCalledWith('contraScan.toast.scanFailed');
        // Se avisa y se SIGUE: castigar al pastor por una falla de
        // infraestructura nuestra sería el trato equivocado.
        expect(onCleared).toHaveBeenCalledWith('s1');
        expect(result.current.scanning).toBe(false);
    });

    it('con el flag apagado pasa directo, sin escanear', async () => {
        gate.enabled = false;
        const onCleared = vi.fn();
        const { result } = renderHook(() => useSermonContraScan({ onCleared }));
        await act(async () => {
            await result.current.attempt('s1', 'idea');
        });

        expect(scan).not.toHaveBeenCalled();
        expect(onCleared).toHaveBeenCalledWith('s1');
    });

    it('camino feliz: abre el modal y NO publica todavía', async () => {
        scan.mockResolvedValue([]);
        const onCleared = vi.fn();
        const { result } = renderHook(() => useSermonContraScan({ onCleared }));
        await act(async () => {
            await result.current.attempt('s1', 'idea');
        });

        expect(result.current.modalOpen).toBe(true);
        expect(onCleared).not.toHaveBeenCalled();
        expect(toastError).not.toHaveBeenCalled();
    });
});
