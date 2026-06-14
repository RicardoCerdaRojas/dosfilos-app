import { useEffect, useState } from 'react';

export interface SelectionInfo {
    text: string;
    rect: DOMRect;
}

/**
 * Rastrea la selección de texto del usuario DENTRO de un mensaje del chat
 * (ancestro con `[data-message-id]`). Devuelve el texto + el rect (para anclar
 * un toolbar flotante), o null.
 *
 * Usa `selectionchange` (debounced con rAF), el patrón robusto: el toolbar sigue
 * la selección en vivo y PERSISTE tras soltar el mouse; se limpia solo cuando la
 * selección realmente se colapsa (click fuera). No usa mousedown/scroll (que
 * causaban que el toolbar parpadeara y desapareciera). La detección por
 * `[data-message-id]` (que ya llevan los mensajes) evita un wrapper que altere
 * el layout (space-y) de la lista.
 */
export function useTextSelection(): {
    selection: SelectionInfo | null;
    clear: () => void;
} {
    const [selection, setSelection] = useState<SelectionInfo | null>(null);

    useEffect(() => {
        let raf = 0;
        const read = () => {
            const sel = window.getSelection();
            if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
                setSelection(null);
                return;
            }
            const text = sel.toString().trim();
            const node = sel.anchorNode;
            const el = node instanceof Element ? node : node?.parentElement ?? null;
            if (!text || !el || !el.closest('[data-message-id]')) {
                setSelection(null);
                return;
            }
            const rect = sel.getRangeAt(0).getBoundingClientRect();
            if (rect.width === 0 && rect.height === 0) {
                setSelection(null);
                return;
            }
            setSelection({ text, rect });
        };
        // Debounce a un frame: durante el drag selectionchange dispara mucho, y
        // diferir a rAF deja que los onClick síncronos (elegir tipo / copiar) se
        // ejecuten ANTES de que un colapso de selección desmonte el toolbar.
        const onChange = () => {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(read);
        };
        document.addEventListener('selectionchange', onChange);
        return () => {
            document.removeEventListener('selectionchange', onChange);
            cancelAnimationFrame(raf);
        };
    }, []);

    return { selection, clear: () => setSelection(null) };
}
