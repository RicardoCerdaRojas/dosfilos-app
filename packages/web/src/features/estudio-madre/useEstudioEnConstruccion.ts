import { useCallback, useSyncExternalStore } from 'react';
import type { ElementoTipo, SubtipoAplicacion } from '@dosfilos/domain';
import {
    addElemento,
    clearDraft,
    getDraft,
    moveElemento,
    removeElemento,
    setContenido,
    setReferencia,
    setRespaldo,
    setRespuesta,
    setSubtipo,
    setTipo,
    setTitulo,
    subscribe,
    type DraftElemento,
    type EstudioDraft,
} from './estudioDraftStore';

/**
 * Acceso reactivo al borrador del "Estudio en construcción" de una sesión.
 * El botón de promoción (en los mensajes) y el panel (rail derecho) usan el
 * mismo hook con el mismo sessionId → quedan en sync vía el store externo.
 */
export interface UseEstudioEnConstruccion {
    elementos: DraftElemento[];
    referencia: string;
    titulo: string;
    /** Respuestas a testigos por claimKey (persisten en el borrador). */
    respuestas: Record<string, string>;
    /** testigos disponibles para respaldar afirmaciones de peso. */
    testigos: DraftElemento[];
    promover: (input: { tipo: ElementoTipo; contenido: string; autoria: DraftElemento['autoria']; mensajeId?: string }) => void;
    quitar: (id: string) => void;
    mover: (id: string, dir: 'up' | 'down') => void;
    cambiarTipo: (id: string, tipo: ElementoTipo) => void;
    cambiarSubtipo: (id: string, subtipo: SubtipoAplicacion | undefined) => void;
    cambiarContenido: (id: string, contenido: string) => void;
    cambiarRespaldo: (id: string, respaldoTestigos: string[]) => void;
    cambiarRespuesta: (claimKey: string, response: string) => void;
    cambiarReferencia: (referencia: string) => void;
    cambiarTitulo: (titulo: string) => void;
    limpiar: () => void;
}

export function useEstudioEnConstruccion(sessionId: string): UseEstudioEnConstruccion {
    const draft: EstudioDraft = useSyncExternalStore(
        subscribe,
        () => getDraft(sessionId),
        () => getDraft(sessionId),
    );

    return {
        elementos: draft.elementos,
        referencia: draft.referencia,
        titulo: draft.titulo,
        respuestas: draft.respuestas,
        // Elementos de soporte elegibles como respaldo de una afirmación de peso
        // (puerta 2). Incluye `cita` para que las afirmaciones experto
        // (argumento/contraargumento/…) puedan respaldarse, no solo las formativas.
        testigos: draft.elementos.filter(
            (e) => e.tipo === 'testigo' || e.tipo === 'testigo_historico' || e.tipo === 'cita',
        ),
        promover: useCallback((input) => addElemento(sessionId, input), [sessionId]),
        quitar: useCallback((id) => removeElemento(sessionId, id), [sessionId]),
        mover: useCallback((id, dir) => moveElemento(sessionId, id, dir), [sessionId]),
        cambiarTipo: useCallback((id, tipo) => setTipo(sessionId, id, tipo), [sessionId]),
        cambiarSubtipo: useCallback((id, subtipo) => setSubtipo(sessionId, id, subtipo), [sessionId]),
        cambiarContenido: useCallback((id, contenido) => setContenido(sessionId, id, contenido), [sessionId]),
        cambiarRespaldo: useCallback((id, ids) => setRespaldo(sessionId, id, ids), [sessionId]),
        cambiarRespuesta: useCallback((claimKey, response) => setRespuesta(sessionId, claimKey, response), [sessionId]),
        cambiarReferencia: useCallback((r) => setReferencia(sessionId, r), [sessionId]),
        cambiarTitulo: useCallback((t) => setTitulo(sessionId, t), [sessionId]),
        limpiar: useCallback(() => clearDraft(sessionId), [sessionId]),
    };
}
