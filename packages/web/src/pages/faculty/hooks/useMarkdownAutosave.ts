import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Autoguardado del editor de recursos, con acuse.
 *
 * **Qué había.** El editor guardaba 1,5 s después de que el usuario
 * dejaba de escribir y no decía nada: ni «guardando», ni «guardado»,
 * ni aviso cuando fallaba. La mutación sólo invalidaba al terminar.
 * Un guardado silencioso que puede fallar en silencio es la única
 * forma que tiene este producto de PERDER trabajo del usuario — el
 * resto de sus fallos degrada calidad o hace esperar.
 *
 * **Qué hace ahora.** Lo mismo, pero contándolo: el estado viaja a la
 * barra del editor, y un fallo se queda ahí —no en un aviso que se va
 * solo— con la opción de reintentar.
 *
 * **Y guarda al salir.** Cerrar el documento o cambiar de recurso
 * fuerza lo pendiente en vez de esperar el temporizador. Es lo que la
 * app puede resolver sola, así que no se le pregunta al usuario.
 *
 * La comparación es contra el texto ORIGINAL del documento cargado, no
 * contra lo último escrito: así, deshacer hasta volver al punto de
 * partida no deja un guardado pendiente que no cambia nada.
 */
export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface UseMarkdownAutosaveInput {
    /** Documento en edición. Al cambiar, lo pendiente se guarda antes. */
    documentId: string | null;
    /** Texto en el editor. */
    draft: string;
    /** Texto tal como vino del servidor. `undefined` mientras carga. */
    original: string | undefined;
    /** Falso mientras el editor no está listo (borrador sin sembrar). */
    enabled: boolean;
    save: (documentId: string, markdown: string) => Promise<unknown>;
    /** Por defecto 1500 ms. */
    delayMs?: number;
}

export interface UseMarkdownAutosaveResult {
    status: AutosaveStatus;
    /** Reintenta el guardado que falló. */
    retry: () => void;
    /** Guarda lo pendiente ya. Se llama al cerrar el documento. */
    flush: () => void;
}

export function useMarkdownAutosave(input: UseMarkdownAutosaveInput): UseMarkdownAutosaveResult {
    const { documentId, draft, original, enabled, save, delayMs = 1500 } = input;
    const [status, setStatus] = useState<AutosaveStatus>('idle');

    // Lo pendiente vive en una ref para que el guardado al salir pueda
    // leerlo desde la limpieza del efecto, cuando el render que lo
    // conocía ya no existe.
    const pendingRef = useRef<{ documentId: string; markdown: string } | null>(null);
    const saveRef = useRef(save);
    saveRef.current = save;

    const run = useCallback(async (documentIdToSave: string, markdown: string) => {
        pendingRef.current = null;
        setStatus('saving');
        try {
            await saveRef.current(documentIdToSave, markdown);
            setStatus('saved');
        } catch (err) {
            console.error('[faculty] autoguardado falló:', err);
            // Lo pendiente NO se descarta: el reintento tiene que tener
            // qué reintentar, y el usuario tiene que poder seguir
            // escribiendo sin perder lo anterior.
            pendingRef.current = { documentId: documentIdToSave, markdown };
            setStatus('error');
        }
    }, []);

    const hayCambios = enabled
        && !!documentId
        && original !== undefined
        && original !== draft;

    // El temporizador. Se reinicia con cada tecla; cuando vence, guarda.
    useEffect(() => {
        if (!hayCambios || !documentId) return;
        pendingRef.current = { documentId, markdown: draft };
        const handle = setTimeout(() => { void run(documentId, draft); }, delayMs);
        return () => clearTimeout(handle);
    }, [hayCambios, documentId, draft, delayMs, run]);

    // Guardado al salir: cambiar de documento o desmontar el editor.
    useEffect(() => {
        if (!documentId) return;
        return () => {
            const pending = pendingRef.current;
            if (pending && pending.documentId === documentId) {
                void run(pending.documentId, pending.markdown);
            }
        };
    }, [documentId, run]);

    // Volver al texto original mientras había un error deja de ser un
    // error: no queda nada que guardar.
    useEffect(() => {
        if (!hayCambios && status === 'error') setStatus('idle');
    }, [hayCambios, status]);

    const retry = useCallback(() => {
        const pending = pendingRef.current;
        if (pending) void run(pending.documentId, pending.markdown);
    }, [run]);

    const flush = useCallback(() => {
        const pending = pendingRef.current;
        if (pending) void run(pending.documentId, pending.markdown);
    }, [run]);

    return { status, retry, flush };
}
