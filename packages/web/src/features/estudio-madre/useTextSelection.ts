import { useEffect, useState } from 'react';

export interface SelectionInfo {
    text: string;
    rect: DOMRect;
}

/**
 * Rastrea la selección de texto del usuario DENTRO de un mensaje del chat
 * (ancestro con `[data-message-id]`). Devuelve el texto + el rect (para anclar
 * un toolbar flotante), o null. Se limpia al deseleccionar, hacer scroll (el
 * rect queda obsoleto), o click fuera del toolbar / del menú de Radix.
 *
 * Se detecta por el atributo `data-message-id` (que ya llevan los mensajes), no
 * por un contenedor wrapper, para no alterar el layout (space-y) de la lista.
 */
export function useTextSelection(): {
    selection: SelectionInfo | null;
    clear: () => void;
} {
    const [selection, setSelection] = useState<SelectionInfo | null>(null);

    useEffect(() => {
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

        // Leer tras el mouseup (selección completa). El timeout deja que el
        // navegador asiente la selección antes de leerla.
        const onMouseUp = () => window.setTimeout(read, 0);
        const onMouseDown = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            // No cerrar si el click es dentro del toolbar o del menú (portal Radix).
            if (target.closest('[data-seleccion-toolbar]') || target.closest('[data-radix-popper-content-wrapper]')) {
                return;
            }
            setSelection(null);
        };
        // Scroll (en cualquier ancestro, capture=true) invalida el rect.
        const onScroll = () => setSelection(null);

        document.addEventListener('mouseup', onMouseUp);
        document.addEventListener('mousedown', onMouseDown);
        window.addEventListener('scroll', onScroll, true);
        return () => {
            document.removeEventListener('mouseup', onMouseUp);
            document.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('scroll', onScroll, true);
        };
    }, []);

    return { selection, clear: () => setSelection(null) };
}
